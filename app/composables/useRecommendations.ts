import type { CaseStudyRecommendation } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'

export const useRecommendations = (rfpId: string) => {
  const recommendations = ref<CaseStudyRecommendation[]>([])
  const analysis = ref<RfpAnalysis | null>(null)
  const error = ref<string | null>(null)
  const actionState = createActionState(['fetching'] as const)

  const fetch = () => actionState.run('fetching', async () => {
    error.value = null
    try {
      const data = await $fetch<{ analysis: RfpAnalysis; recommendations: CaseStudyRecommendation[] }>(
        `/api/rfps/${rfpId}/recommendations`
      )
      analysis.value = data.analysis
      recommendations.value = data.recommendations
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch recommendations'
    }
  })

  const toggleSelection = (id: string) => {
    const rec = recommendations.value.find((r) => r.id === id)
    if (rec) rec.selected = !rec.selected
  }

  const selectedIds = computed(() =>
    recommendations.value.filter((r) => r.selected).map((r) => r.caseStudyId)
  )

  return { recommendations, analysis, loading: actionState.loading, fetching: actionState.isActive('fetching'), error, fetch, toggleSelection, selectedIds }
}
