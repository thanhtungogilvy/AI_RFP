<script setup lang="ts">
const { upload, loading, error } = useCaseStudies()
const router = useRouter()

const uploadedFile = ref<File | null>(null)
const uploadSuccess = ref(false)
const title = ref('')
const client = ref('')
const industry = ref('')

async function handleFile(file: File) {
  uploadedFile.value = file
  if (!title.value) title.value = file.name.replace(/\.pptx$/i, '')
}

async function handleSubmit() {
  if (!uploadedFile.value || !title.value.trim() || !client.value.trim()) return
  try {
    const formData = new FormData()
    formData.append('file', uploadedFile.value)
    formData.append('title', title.value)
    formData.append('client', client.value)
    formData.append('industry', industry.value)
    await $fetch('/api/case-studies/upload', { method: 'POST', body: formData })
    uploadSuccess.value = true
    setTimeout(() => router.push('/case-studies'), 1500)
  } catch {
    // error is reactive in the composable
  }
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Upload Case Study"
      description="Upload a PPTX file. Slides will be extracted and indexed automatically."
    >
      <template #actions>
        <NuxtLink to="/case-studies">
          <Button variant="outline" size="sm">Back to Knowledge Base</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="max-w-xl">
      <div v-if="uploadSuccess" class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p class="font-medium">Case study indexed successfully.</p><NuxtLink to="/case-studies" class="mt-2 inline-block underline">Continue to Knowledge Base →</NuxtLink>
      </div>

      <div v-else>
        <FileDropzone
          accept=".pptx"
          label="Drop your PPTX case study here or click to browse"
          hint="PPTX files only · Max 50MB"
          :loading="loading"
          @file="handleFile"
        />

        <div v-if="uploadedFile" class="mt-4 space-y-3">
          <p class="text-xs text-muted-foreground">Selected: <span class="font-medium text-foreground">{{ uploadedFile.name }}</span></p>
          <input v-model="title" placeholder="Case study title" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input v-model="client" placeholder="Client name" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input v-model="industry" placeholder="Industry (optional)" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <Button :disabled="loading || !title.trim() || !client.trim()" @click="handleSubmit">{{ loading ? 'Indexing…' : 'Upload & Index' }}</Button>
        </div>

        <p v-if="error" class="mt-3 text-sm text-destructive">{{ error }}</p>
      </div>
    </div>
  </AppShell>
</template>
