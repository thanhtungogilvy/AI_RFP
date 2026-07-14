<script setup lang="ts">
const { upload, loading, error } = useCaseStudies()
const router = useRouter()

const uploadedFile = ref<File | null>(null)
const uploadSuccess = ref(false)

async function handleFile(file: File) {
  uploadedFile.value = file
  try {
    await upload(file)
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
        Presentation indexed successfully! Redirecting to the knowledge base...
      </div>

      <div v-else>
        <FileDropzone
          accept=".pptx"
          label="Drop your PPTX case study here or click to browse"
          hint="PPTX files only · Max 50MB"
          :loading="loading"
          @file="handleFile"
        />

        <p v-if="uploadedFile && !loading" class="mt-3 text-xs text-muted-foreground">
          Selected: <span class="font-medium text-foreground">{{ uploadedFile.name }}</span>
        </p>

        <p v-if="error" class="mt-3 text-sm text-destructive">{{ error }}</p>
      </div>
    </div>
  </AppShell>
</template>
