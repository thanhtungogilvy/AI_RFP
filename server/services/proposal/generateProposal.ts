import type { ProposalGeneration } from '~/types/proposal'

/**
 * Orchestrates the full proposal generation pipeline.
 * TODO: Wire up all service dependencies end-to-end
 */
export async function generateProposal(
  _rfpId: string,
  _selectedCaseStudyIds: string[]
): Promise<ProposalGeneration> {
  // TODO: Fetch RfpDocument and RfpAnalysis from Supabase
  // TODO: Fetch selected CaseStudy records from Supabase
  // TODO: Call buildProposalData() to assemble deck data
  // TODO: Call generateProposalDeck() to produce PPTX buffer
  // TODO: Upload PPTX to Supabase Storage via uploadFile()
  // TODO: Persist ProposalGeneration record to Supabase DB
  // TODO: Return final ProposalGeneration object
  throw new Error('Proposal generation pipeline not yet implemented')
}
