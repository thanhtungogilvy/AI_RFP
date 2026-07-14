<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const rfpId = route.params.id as string

const { recommendations, analysis, loading, error, fetch, toggleSelection, selectedIds } = useRecommendations(rfpId)
const { generate, loading: generating, error: genError } = useProposalGeneration()

onMounted(fetch)

async function handleGenerate() {
  const proposal = await generate(rfpId, selectedIds.value)
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
      </template>
    </PageHeader>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-lg bg-muted" />
    </div>

    <div v-else-if="error" class="text-sm text-destructive">{{ error }}</div>

    <div v-else class="grid grid-cols-5 gap-6">
      <!-- RFP Analysis Panel -->
      <div class="col-span-2 space-y-4">
        <h2 class="text-sm font-semibold text-foreground">RFP Analysis</h2>

        <div v-if="analysis" class="rounded-lg border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground leading-relaxed mb-4">{{ analysis.summary }}</p>

          <h3 class="mb-2 text-xs font-semibold text-foreground">Requirements</h3>
          <ul class="space-y-2">
            <li
              v-for="req in analysis.requirements"
              :key="req.id"
              class="flex items-start gap-2 text-xs"
            >
              <span
                class="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                :class="{
                  'bg-red-100 text-red-700': req.priority === 'high',
                  'bg-yellow-100 text-yellow-700': req.priority === 'medium',
                  'bg-gray-100 text-gray-600': req.priority === 'low',
                }"
              >
                {{ req.priority }}
              </span>
              <span class="text-muted-foreground"><span class="font-medium text-foreground">{{ req.category }}:</span> {{ req.description }}</span>
            </li>
          </ul>

          <div class="mt-4">
            <h3 class="mb-2 text-xs font-semibold text-foreground">Key Themes</h3>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="theme in analysis.keyThemes"
                :key="theme"
                class="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
              >
                {{ theme }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="col-span-3 space-y-4">
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
