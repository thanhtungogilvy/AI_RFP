<script setup lang="ts">
import type { RfpDocument } from '~/types/rfp'

const route = useRoute()
const router = useRouter()
const { fetchById, updateMetadata, replaceFile, loading, updating, replacing, error } = useRfps()
const rfp = ref<RfpDocument | null>(null)
const title = ref('')
const client = ref('')
const industry = ref('')
const deadline = ref('')
const replacementFile = ref<File | null>(null)
const metadataSaved = ref(false)

const rfpId = computed(() => String(route.params.id))
const canSaveMetadata = computed(() => !!title.value.trim() && !!client.value.trim())

onMounted(async () => {
  try {
    const document = await fetchById(rfpId.value)
    rfp.value = document
    title.value = document.title
    client.value = document.client
    industry.value = document.industry
    deadline.value = document.deadline ?? ''
  } catch {
    // The composable exposes the error state.
  }
})

async function saveMetadata() {
  try {
    rfp.value = await updateMetadata(rfpId.value, {
      title: title.value,
      client: client.value,
      industry: industry.value,
      deadline: deadline.value || undefined,
    })
    metadataSaved.value = true
  } catch {
    // The composable exposes the error state.
  }
}

async function replaceDocument() {
  if (!replacementFile.value) return
  try {
    await replaceFile(rfpId.value, replacementFile.value)
    await router.push(`/rfps/${rfpId.value}/recommendations`)
  } catch {
    // The composable exposes the error state.
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Edit RFP" description="Update document metadata or replace the source file.">
      <template #actions>
        <NuxtLink :to="`/rfps/${rfpId}`"><Button variant="outline" size="sm">Cancel</Button></NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loading && !rfp" class="h-72 max-w-xl animate-pulse rounded-lg bg-muted" />
    <div v-else class="max-w-xl space-y-8">
      <form class="space-y-4" @submit.prevent="saveMetadata">
        <div v-if="metadataSaved" class="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Changes saved.</div>
        <div>
          <label class="mb-1 block text-xs font-medium text-foreground" for="rfp-title">RFP Title <span class="text-destructive">*</span></label>
          <input id="rfp-title" v-model="title" type="text" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-foreground" for="rfp-client">Client Name <span class="text-destructive">*</span></label>
          <input id="rfp-client" v-model="client" type="text" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-foreground" for="rfp-industry">Industry</label>
          <input id="rfp-industry" v-model="industry" type="text" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-foreground" for="rfp-deadline">Deadline</label>
          <input id="rfp-deadline" v-model="deadline" type="date" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <Button type="submit" :disabled="!canSaveMetadata || updating">{{ updating ? 'Saving...' : 'Save changes' }}</Button>
      </form>

      <section class="border-t border-border pt-8">
        <h2 class="text-sm font-semibold text-foreground">Replace document</h2>
        <div class="mt-4 space-y-4">
          <FileDropzone accept=".pdf,.docx" label="Drop a replacement RFP document here or click to browse" hint="PDF or DOCX · Max 50MB" :loading="replacing" @file="replacementFile = $event" />
          <p v-if="replacementFile" class="text-sm text-muted-foreground">{{ replacementFile.name }}</p>
          <Button :disabled="!replacementFile || replacing" @click="replaceDocument">{{ replacing ? 'Replacing & analyzing...' : 'Replace and analyze' }}</Button>
        </div>
      </section>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
    </div>
  </AppShell>
</template>