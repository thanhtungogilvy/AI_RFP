<script setup lang="ts">
const { caseStudies, loading, fetchAll, search } = useCaseStudies()

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
    <EmptyState
      v-else-if="!caseStudies.length"
      title="No case studies found"
      description="Upload a PPTX file to start building your knowledge base."
    >
      <template #action>
        <NuxtLink to="/case-studies/upload">
          <Button size="sm">Upload Case Study</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- Grid -->
    <div v-else class="grid grid-cols-3 gap-4">
      <CaseStudyCard
        v-for="cs in caseStudies"
        :key="cs.id"
        :case-study="cs"
      />
    </div>
  </AppShell>
</template>
