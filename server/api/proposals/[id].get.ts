import { existsSync } from 'node:fs'
import type { ProposalGeneration } from '~/types/proposal'
import { getPptxPath } from '../../services/proposal/generateProposal'
import { dbGetProposalById } from '../../services/supabase/db'

const MOCK_PROPOSALS: Record<string, ProposalGeneration> = {
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

  // 1. Check static mock (demo proposal)
  if (MOCK_PROPOSALS[id]) return MOCK_PROPOSALS[id]

  // 2. Query Supabase
  const fromDb = await dbGetProposalById(id)
  if (fromDb) return fromDb

  // 3. Reconstruct from disk (generated proposals before Supabase was configured)
  if (existsSync(getPptxPath(id))) {
    return {
      id,
      rfpId: '',
      title: 'Generated Proposal',
      status: 'completed',
      selectedCaseStudyIds: [],
      pptxUrl: `/api/proposals/${id}/download?format=pptx`,
      pdfUrl: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    } satisfies ProposalGeneration
  }

  throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
})
