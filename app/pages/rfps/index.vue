<script setup lang="ts">
const { rfps, loading, error, fetchAll, analyze } = useRfps()

async function handleAnalyze(id: string) {
  try {
    await analyze(id)
    await fetchAll()
  } catch {
    // The composable exposes the error state.
  }
}

onMounted(fetchAll)
</script>

<template>
  <AppShell>
    <PageHeader title="RFP Documents" description="Uploaded RFP documents ready for AI analysis.">
      <template #actions>
        <NuxtLink to="/rfps/upload">
          <Button size="sm">Upload RFP</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 gap-4">
      <div v-for="i in 2" :key="i" class="h-36 animate-pulse rounded-lg bg-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="error" class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <span>{{ error }}</span><Button size="sm" variant="outline" @click="fetchAll">Retry</Button>
    </div>
    <EmptyState v-else-if="!rfps.length" title="No RFP documents" description="Upload a PDF or DOCX RFP to start analysis." />

    <!-- Grid -->
    <div v-if="rfps.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <RfpCard v-for="rfp in rfps" :key="rfp.id" :rfp="rfp" @analyze="handleAnalyze" />
    </div>
  </AppShell>
</template>
