<script setup lang="ts">
const { caseStudies, loading, error, fetchAll, search } = useCaseStudies()

const query = ref('')
const debouncedSearch = useDebounceFn(async () => {
  if (query.value.trim()) {
    await search(query.value)
  } else {
    await fetchAll()
  }
}, 300)

watch(query, debouncedSearch)

onMounted(fetchAll)

function retry() {
  return query.value.trim() ? search(query.value) : fetchAll()
}
</script>

<template>
  <AppShell>
    <PageHeader title="Case Studies" description="Indexed knowledge base of case study PPTX files.">
      <template #actions>
        <NuxtLink to="/case-studies/upload">
          <Button size="sm">Upload Case Study</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Search -->
    <div class="mb-6">
      <input
        v-model="query"
        type="text"
        placeholder="Search by client, industry, or tag..."
        class="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-lg bg-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="error" class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <span>{{ error }}</span><Button size="sm" variant="outline" @click="retry">Retry</Button>
    </div>
    <EmptyState
      v-else-if="!caseStudies.length"
      :title="query.trim() ? 'No search results' : 'Knowledge Base is empty'"
      :description="query.trim() ? 'Try a different keyword, client, industry, or slide phrase.' : 'Upload a PPTX case study to start building the indexed library.'"
    />

    <!-- Grid -->
    <div v-if="caseStudies.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <CaseStudyCard
        v-for="cs in caseStudies"
        :key="cs.id"
        :case-study="cs"
      />
    </div>
  </AppShell>
</template>
