<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const rfpId = route.params.id as string

const { recommendations, analysis, loading, error, fetch, toggleSelection, selectedIds } = useRecommendations(rfpId)
const { generate, loading: generating, error: genError } = useProposalGeneration()
const pdfAvailable = ref(false)
const includePdf = ref(false)

onMounted(async () => {
  await fetch()
  try {
    const capabilities = await $fetch<{ pdfExport: boolean }>('/api/capabilities')
    pdfAvailable.value = capabilities.pdfExport
  } catch {
    pdfAvailable.value = false
  }
})

async function handleGenerate() {
  const proposal = await generate(rfpId, selectedIds.value, includePdf.value)
  if (proposal) {
    router.push(`/proposals/${proposal.id}`)
  }
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="AI Recommendations"
      description="Review requirements extracted from the RFP and select relevant case studies."
    >
      <template #actions>
        <NuxtLink to="/rfps">
          <Button variant="outline" size="sm">Back to RFPs</Button>
        </NuxtLink>
        <Button
          :disabled="!selectedIds.length || generating"
          @click="handleGenerate"
        >
          {{ generating ? 'Generating...' : `Generate Proposal (${selectedIds.length} selected)` }}
        </Button>
        <label v-if="pdfAvailable" class="flex items-center gap-1 text-xs text-muted-foreground">
          <input v-model="includePdf" type="checkbox" /> Also generate PDF
        </label>
      </template>
    </PageHeader>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-lg bg-muted" />
    </div>

    <div v-else-if="error" class="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <span>{{ error }}</span><Button size="sm" variant="outline" @click="fetch">Retry recommendations</Button>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <!-- RFP Analysis Panel -->
      <div class="space-y-4 xl:col-span-2">
        <h2 class="text-sm font-semibold text-foreground">RFP Analysis</h2>

        <div v-if="analysis" class="rounded-lg border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground leading-relaxed mb-4">{{ analysis.summary }}</p>

          <h3 class="mb-2 text-xs font-semibold text-foreground">Required Capabilities</h3>
          <ul class="space-y-2">
            <li
              v-for="capability in analysis.requiredCapabilities"
              :key="capability"
              class="flex items-start gap-2 text-xs"
            >
              <span class="text-muted-foreground">{{ capability }}</span>
            </li>
          </ul>

          <div class="mt-4">
            <h3 class="mb-2 text-xs font-semibold text-foreground">Search Keywords</h3>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="keyword in analysis.searchKeywords"
                :key="keyword"
                class="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
              >
                {{ keyword }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="space-y-4 xl:col-span-3">
        <h2 class="text-sm font-semibold text-foreground">
          Recommended Case Studies
          <span class="ml-1 font-normal text-muted-foreground">({{ recommendations.length }} found)</span>
        </h2>

        <EmptyState
          v-if="!recommendations.length"
          title="No recommendations"
          description="No relevant case studies found for this RFP."
        />

        <RecommendationCard
          v-for="rec in recommendations"
          :key="rec.id"
          :recommendation="rec"
          @toggle="toggleSelection"
        />

        <p v-if="genError" class="text-sm text-destructive">{{ genError }}</p>
      </div>
    </div>
  </AppShell>
</template>
