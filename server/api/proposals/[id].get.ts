import { existsSync } from 'node:fs'
import type { ProposalGeneration } from '~/types/proposal'
import { getPptxPath } from '../../services/proposal/generateProposal'

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
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing proposal id' })

  // Check mock store first (static demo proposal)
  if (mockProposals[id]) return mockProposals[id]

  // For dynamically generated proposals: reconstruct metadata from the PPTX file on disk.
  // TODO: Replace with Supabase DB query when persistence is implemented.
  const filePath = getPptxPath(id)
  if (existsSync(filePath)) {
    const proposal: ProposalGeneration = {
      id,
      rfpId: 'rfp-001',
      title: 'Generated Proposal',
      status: 'completed',
      selectedCaseStudyIds: [],
      pptxUrl: `/api/proposals/${id}/download?format=pptx`,
      pdfUrl: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }
    return proposal
  }

  throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
})
