<script setup lang="ts">
const route = useRoute()
const rfpId = route.params.id as string

interface RfpDebugResponse {
  id: string
  title: string
  client: string
  industry: string
  deadline?: string | null
  file_name: string
  file_path?: string | null
  content: string
  analysis: unknown | null
  embedding: number[] | null
  status: string
  uploaded_at: string
  created_at: string
  embeddingCount: number
  embeddingPreview: number[]
  contentLength: number
  wordCount: number
  lineCount: number
  extractionWarnings: string[]
  analysisKeys: string[]
}

const debug = ref<RfpDebugResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchDebug() {
  loading.value = true
  error.value = null
  try {
    debug.value = await $fetch<RfpDebugResponse>(`/api/rfps/${rfpId}/debug`)
  } catch (caught: unknown) {
    error.value = caught instanceof Error ? caught.message : 'Failed to fetch RFP debug data'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDebug)

function prettyJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2)
}
</script>

<template>
  <AppShell>
    <PageHeader title="RFP Debug" description="Inspect uploaded file, extracted content, analysis, and embedding values.">
      <template #actions>
        <NuxtLink :to="`/rfps/${rfpId}/recommendations`">
          <Button variant="outline" size="sm">Recommendations</Button>
        </NuxtLink>
        <NuxtLink to="/rfps">
          <Button variant="outline" size="sm">Back to RFPs</Button>
        </NuxtLink>
        <Button size="sm" :disabled="loading" @click="fetchDebug">Reload</Button>
      </template>
    </PageHeader>

    <div v-if="loading" class="space-y-4">
      <div class="h-24 animate-pulse rounded-lg bg-muted" />
      <div class="h-96 animate-pulse rounded-lg bg-muted" />
    </div>

    <div v-else-if="error" class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {{ error }}
    </div>

    <div v-else-if="debug" class="space-y-6">
      <div v-if="debug.extractionWarnings.length" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        <p class="font-medium">Extraction warning</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="warning in debug.extractionWarnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-lg border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground">Title</p>
          <p class="mt-1 text-sm font-medium text-foreground">{{ debug.title }}</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground">Client</p>
          <p class="mt-1 text-sm font-medium text-foreground">{{ debug.client }}</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground">Status</p>
          <p class="mt-1 text-sm font-medium text-foreground">{{ debug.status }}</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground">Embedding</p>
          <p class="mt-1 text-sm font-medium text-foreground">{{ debug.embeddingCount }} dims</p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-2">
        <section class="rounded-lg border border-border bg-card p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-foreground">Uploaded File</h2>
            <span class="text-xs text-muted-foreground">{{ debug.file_name }}</span>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt class="text-muted-foreground">File path</dt>
              <dd class="break-all text-foreground">{{ debug.file_path || '—' }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Uploaded at</dt>
              <dd class="text-foreground">{{ new Date(debug.uploaded_at).toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Created at</dt>
              <dd class="text-foreground">{{ new Date(debug.created_at).toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Content length</dt>
              <dd class="text-foreground">{{ debug.contentLength }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Word count</dt>
              <dd class="text-foreground">{{ debug.wordCount }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Line count</dt>
              <dd class="text-foreground">{{ debug.lineCount }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-lg border border-border bg-card p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-foreground">Embedding Preview</h2>
            <span class="text-xs text-muted-foreground">first 16 values</span>
          </div>
          <pre class="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">{{ prettyJson(debug.embeddingPreview) }}</pre>
        </section>
      </div>

      <section class="rounded-lg border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-foreground">Extracted Content</h2>
          <span class="text-xs text-muted-foreground">{{ debug.contentLength }} chars</span>
        </div>
        <pre class="max-h-[28rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-foreground whitespace-pre-wrap">{{ debug.content || 'No extracted content' }}</pre>
      </section>

      <section class="rounded-lg border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-foreground">Analysis JSON</h2>
          <span class="text-xs text-muted-foreground">keys: {{ debug.analysisKeys.join(', ') || 'none' }}</span>
        </div>
        <pre class="max-h-[28rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-foreground whitespace-pre-wrap">{{ prettyJson(debug.analysis) }}</pre>
      </section>

      <section class="rounded-lg border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-foreground">Raw Debug Payload</h2>
        </div>
        <pre class="max-h-[28rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-foreground whitespace-pre-wrap">{{ prettyJson(debug) }}</pre>
      </section>
    </div>
  </AppShell>
</template>