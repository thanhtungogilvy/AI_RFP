import type { ProposalGeneration } from '~/types/proposal'

export const useProposalGeneration = () => {
  const proposal = ref<ProposalGeneration | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const generate = async (rfpId: string, selectedCaseStudyIds: string[], includePdf = false) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<ProposalGeneration>('/api/proposals/generate', {
        method: 'POST',
        body: { rfpId, selectedCaseStudyIds, includePdf },
      })
      proposal.value = data
      return data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to generate proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchProposal = async (proposalId: string) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<ProposalGeneration>(`/api/proposals/${proposalId}`)
      proposal.value = data
      return data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to fetch proposal'
    } finally {
      loading.value = false
    }
  }

  return { proposal, loading, error, generate, fetchProposal }
}
