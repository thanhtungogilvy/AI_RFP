import type { RequirementRecommendation } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'
import { openSseStream } from '~/utils/sseClient'

export const useRecommendations = (rfpId: string) => {
  const recommendations = ref<RequirementRecommendation[]>([])
  const analysis = ref<RfpAnalysis | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  const progressStep = ref<string | null>(null)
  const progressMessage = ref<string | null>(null)

  const fetch = (options: { refresh?: boolean } = {}) => {
    if (loading.value) return
    loading.value = true
    error.value = null
    progressStep.value = null
    progressMessage.value = null

    const url = `/api/rfps/${rfpId}/recommendations${options.refresh ? '?refresh=true' : ''}`

    openSseStream<{ analysis: RfpAnalysis; recommendations: RequirementRecommendation[] }>(url)
      .onProgress((step, message) => {
        progressStep.value = step
        progressMessage.value = message
      })
      .onDone((data) => {
        analysis.value = data.analysis
        recommendations.value = data.recommendations
        loading.value = false
        progressStep.value = null
        progressMessage.value = null
      })
      .onError((message) => {
        error.value = message
        loading.value = false
        progressStep.value = null
        progressMessage.value = null
      })
  }

  const toggleSelection = (id: string) => {
    const rec = recommendations.value.find((r) => r.id === id)
    if (rec) rec.selected = !rec.selected
  }

  const selectedIds = computed(() =>
    recommendations.value.filter((r) => r.selected).map((r) => r.id)
  )

  return { recommendations, analysis, loading, progressStep, progressMessage, error, fetch, toggleSelection, selectedIds }
}
