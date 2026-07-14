import type { ProposalGeneration } from '~/types/proposal'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { rfpId, selectedCaseStudyIds } = body

  // TODO: Validate rfpId and selectedCaseStudyIds
  // TODO: Fetch RFP data and selected case studies from Supabase
  // TODO: Call server/services/proposal/buildProposalData.ts to assemble slide data
  // TODO: Call server/services/pptx/generateProposalDeck.ts to create the PPTX file
  // TODO: Upload the generated PPTX to Supabase Storage
  // TODO: Persist ProposalGeneration record in Supabase DB

  const proposal: ProposalGeneration = {
    id: 'proposal-demo-001',
    rfpId: rfpId ?? 'rfp-001',
    title: 'Proposal for ABC Bank',
    status: 'completed',
    selectedCaseStudyIds: selectedCaseStudyIds ?? [],
    pptxUrl: '/api/proposals/proposal-demo-001/download?format=pptx',
    pdfUrl: null,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  }

  return proposal
})
