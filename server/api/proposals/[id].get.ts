import type { ProposalGeneration } from '~/types/proposal'

const mockProposals: Record<string, ProposalGeneration> = {
  'proposal-demo-001': {
    id: 'proposal-demo-001',
    rfpId: 'rfp-001',
    title: 'Proposal for ABC Bank',
    status: 'completed',
    selectedCaseStudyIds: ['cs-001'],
    pptxUrl: '/api/proposals/proposal-demo-001/download?format=pptx',
    pdfUrl: null,
    createdAt: '2025-07-14T10:00:00Z',
    completedAt: '2025-07-14T10:01:30Z',
  },
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  // TODO: Fetch ProposalGeneration record from Supabase DB by id

  const proposal = mockProposals[id!]
  if (!proposal) {
    throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
  }

  return proposal
})
