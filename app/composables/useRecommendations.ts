import type { CaseStudyRecommendation } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'

export const useRecommendations = (rfpId: string) => {
  const recommendations = ref<CaseStudyRecommendation[]>([])
  const analysis = ref<RfpAnalysis | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetch = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{ analysis: RfpAnalysis; recommendations: CaseStudyRecommendation[] }>(
        `/api/rfps/${rfpId}/recommendations`
      )
      analysis.value = data.analysis
      recommendations.value = data.recommendations
    } catch (e: any) {
      error.value = e.message ?? 'Failed to fetch recommendations'
    } finally {
      loading.value = false
    }
  }

  const toggleSelection = (id: string) => {
    const rec = recommendations.value.find((r) => r.id === id)
    if (rec) rec.selected = !rec.selected
  }

  const selectedIds = computed(() =>
    recommendations.value.filter((r) => r.selected).map((r) => r.caseStudyId)
  )

  return { recommendations, analysis, loading, error, fetch, toggleSelection, selectedIds }
}
