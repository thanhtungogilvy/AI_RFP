<script setup lang="ts">
const { upload, analyze, loading, error } = useRfps()
const router = useRouter()

const uploadedFile = ref<File | null>(null)
const title = ref('')
const client = ref('')
const industry = ref('')
const uploadSuccess = ref(false)

const canSubmit = computed(() => !!uploadedFile.value && !!title.value && !!client.value)

async function handleFile(file: File) {
  uploadedFile.value = file
  if (!title.value) title.value = file.name.replace(/\.[^/.]+$/, '')
}

async function handleSubmit() {
  if (!uploadedFile.value) return
  try {
    const rfp = await upload(uploadedFile.value, {
      title: title.value,
      client: client.value,
      industry: industry.value,
    })
    await analyze(rfp.id)
    uploadSuccess.value = true
    setTimeout(() => router.push(`/rfps/${rfp.id}/recommendations`), 1500)
  } catch {
    // error is reactive in the composable
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Upload RFP" description="Upload an RFP document to start generating AI-powered recommendations.">
      <template #actions>
        <NuxtLink to="/rfps">
          <Button variant="outline" size="sm">Back to RFPs</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="max-w-xl space-y-6">
      <div v-if="uploadSuccess" class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p class="font-medium">RFP uploaded and analyzed successfully.</p><NuxtLink to="/rfps" class="mt-2 inline-block underline">Continue to RFPs →</NuxtLink>
      </div>

      <template v-else>
        <FileDropzone
          accept=".pdf,.docx,.doc"
          label="Drop your RFP document here or click to browse"
          hint="PDF or DOCX · Max 50MB"
          :loading="loading"
          @file="handleFile"
        />

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-foreground">RFP Title <span class="text-destructive">*</span></label>
            <input
              v-model="title"
              type="text"
              placeholder="e.g. Core Banking Modernisation RFP"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-foreground">Client Name <span class="text-destructive">*</span></label>
            <input
              v-model="client"
              type="text"
              placeholder="e.g. ABC Bank"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-foreground">Industry</label>
            <input
              v-model="industry"
              type="text"
              placeholder="e.g. Banking & Finance"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <Button :disabled="!canSubmit || loading" @click="handleSubmit">
          {{ loading ? 'Uploading & analyzing…' : 'Analyze RFP' }}
        </Button>
      </template>
    </div>
  </AppShell>
</template>
