<script setup lang="ts">
const { caseStudies, loading, fetchAll, search } = useCaseStudies()
import { demoCaseStudies } from '~/utils/demoData'
const displayCaseStudies = computed(() => caseStudies.value.length ? caseStudies.value : demoCaseStudies)

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
    <div v-else-if="!caseStudies.length" class="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Demo data is shown while your knowledge base is empty. <NuxtLink class="font-medium underline" to="/case-studies/upload">Upload Case Study</NuxtLink> to use real content.</div>

    <!-- Grid -->
    <div v-if="displayCaseStudies.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <CaseStudyCard
        v-for="cs in displayCaseStudies"
        :key="cs.id"
        :case-study="cs"
      />
    </div>
  </AppShell>
</template>
