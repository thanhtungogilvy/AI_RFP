import type { ProposalGeneration } from '~/types/proposal'

export const useProposalGeneration = () => {
  const proposal = ref<ProposalGeneration | null>(null)
  const error = ref<string | null>(null)
  const actionState = createActionState(['fetching', 'generating'] as const)

  const generate = (rfpId: string, selectedCaseStudyIds: string[], includePdf = false) => actionState.run('generating', async () => {
    error.value = null
    try {
      const data = await $fetch<ProposalGeneration>('/api/proposals/generate', {
        method: 'POST',
        body: { rfpId, selectedCaseStudyIds, includePdf },
      })
      proposal.value = data
      return data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to generate proposal'
      throw caught
    }
  })

  const fetchProposal = (proposalId: string) => actionState.run('fetching', async () => {
    error.value = null
    try {
      const data = await $fetch<ProposalGeneration>(`/api/proposals/${proposalId}`)
      proposal.value = data
      return data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch proposal'
    }
  })

  return {
    proposal, error, generate, fetchProposal,
    loading: actionState.loading,
    fetching: actionState.isActive('fetching'),
    generating: actionState.isActive('generating'),
  }
}
