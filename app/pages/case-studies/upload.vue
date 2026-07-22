<script setup lang="ts">
import type { CaseStudyUploadItemInput, CaseStudyUploadItemResult } from '~/composables/useCaseStudies'

const { uploadBatch, loading, error } = useCaseStudies()

interface UploadDraft {
  id: string
  file: File
  title: string
  client: string
  industry: string
}

interface UploadBatchSummary {
  total: number
  success: number
  failed: number
}

const MAX_BATCH_FILES = 10

const drafts = ref<UploadDraft[]>([])
const results = ref<CaseStudyUploadItemResult[]>([])
const summary = ref<UploadBatchSummary | null>(null)

const hasDrafts = computed(() => drafts.value.length > 0)
const canSubmit = computed(() =>
  hasDrafts.value
  && drafts.value.every((item) => item.title.trim() && item.client.trim())
)

function makeId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function addFiles(files: File[]) {
  const remainingSlots = Math.max(0, MAX_BATCH_FILES - drafts.value.length)
  const additions = files
    .filter((file) => /\.pptx$/i.test(file.name))
    .slice(0, remainingSlots)
    .map((file) => ({
      id: makeId(),
      file,
      title: file.name.replace(/\.pptx$/i, ''),
      client: '',
      industry: '',
    }))

  if (!additions.length) return
  drafts.value = [...drafts.value, ...additions]
  results.value = []
  summary.value = null
}

function removeDraft(id: string) {
  drafts.value = drafts.value.filter((item) => item.id !== id)
}

function clearDrafts() {
  drafts.value = []
  results.value = []
  summary.value = null
}

async function handleSubmit() {
  if (!canSubmit.value) return
  try {
    const payload: CaseStudyUploadItemInput[] = drafts.value.map((item) => ({
      id: item.id,
      file: item.file,
      title: item.title,
      client: item.client,
      industry: item.industry,
    }))
    const batch = await uploadBatch(payload)
    summary.value = {
      total: batch.total,
      success: batch.success,
      failed: batch.failed,
    }
    results.value = batch.results

    const failedIds = new Set(batch.results.filter((item) => item.status === 'error').map((item) => item.id))
    drafts.value = drafts.value.filter((item) => failedIds.has(item.id))
  } catch {
    // error is reactive in the composable
  }
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Upload Case Study"
      description="Upload multiple PPTX files. Each file can have its own title, client, and industry metadata."
    >
      <template #actions>
        <NuxtLink to="/case-studies">
          <Button variant="outline" size="sm">Back to Knowledge Base</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="max-w-3xl space-y-4">
      <div>
        <FileDropzone
          accept=".pptx"
          :multiple="true"
          label="Drop PPTX case studies here or click to browse"
          hint="PPTX files only · Max 50MB each · Up to 10 files per batch"
          :loading="loading"
          @files="addFiles"
        />

        <p class="mt-2 text-xs text-muted-foreground">
          💡 Have a PDF? Open it in PowerPoint → <span class="font-medium text-foreground">File → Save As → PowerPoint (.pptx)</span> before uploading.
        </p>

        <div class="mt-3 flex items-center justify-between">
          <p class="text-xs text-muted-foreground">{{ drafts.length }} file(s) ready</p>
          <Button variant="outline" size="sm" :disabled="!drafts.length || loading" @click="clearDrafts">Clear all</Button>
        </div>
      </div>

      <div v-if="summary" class="rounded-lg border border-border bg-card p-4 text-sm">
        <p class="font-medium text-foreground">Batch completed: {{ summary.success }}/{{ summary.total }} indexed</p>
        <p v-if="summary.failed" class="mt-1 text-amber-700">{{ summary.failed }} file(s) failed. You can fix metadata and retry remaining items below.</p>
        <NuxtLink v-if="summary.success" to="/case-studies" class="mt-2 inline-block text-xs underline">Go to Knowledge Base →</NuxtLink>
      </div>

      <div v-if="results.length" class="rounded-lg border border-border bg-card p-4">
        <h3 class="text-sm font-semibold text-foreground">Latest results</h3>
        <ul class="mt-3 space-y-2">
          <li v-for="item in results" :key="`result-${item.id}`" class="rounded border border-border p-2 text-xs">
            <p class="font-medium text-foreground">{{ item.fileName }}</p>
            <p :class="item.status === 'success' ? 'text-green-700' : 'text-destructive'">
              {{ item.status === 'success' ? 'Indexed successfully' : item.error }}
            </p>
          </li>
        </ul>
      </div>

      <div v-if="hasDrafts" class="space-y-3">
        <div
          v-for="item in drafts"
          :key="item.id"
          class="rounded-lg border border-border bg-card p-4"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-foreground">{{ item.file.name }}</p>
            <Button variant="ghost" size="sm" :disabled="loading" @click="removeDraft(item.id)">Remove</Button>
          </div>
          <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input v-model="item.title" placeholder="Case study title" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <input v-model="item.client" placeholder="Client name" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <input v-model="item.industry" placeholder="Industry (optional)" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <Button :disabled="loading || !canSubmit" @click="handleSubmit">{{ loading ? 'Indexing batch…' : `Upload & Index ${drafts.length} file(s)` }}</Button>
        <p v-if="error" class="mt-3 text-sm text-destructive">{{ error }}</p>
      </div>
    </div>
  </AppShell>
</template>
