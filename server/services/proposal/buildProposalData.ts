import type { RfpDocument } from '~/types/rfp'
import type { CaseStudy } from '~/types/case-study'
import type { ProposalDeckData } from '../pptx/generateProposalDeck'

/**
 * Assemble all data needed to render the proposal deck.
 * TODO: Fetch from Supabase and apply AI-generated executive summary
 */
export async function buildProposalData(
  _rfp: RfpDocument,
  _selectedCaseStudies: CaseStudy[]
): Promise<ProposalDeckData> {
  // TODO: Generate executive summary tailored to the RFP using AI provider
  // TODO: Order case studies by relevance score
  // TODO: Assemble slide-level data for each case study
  // TODO: Add metadata (presenter name, date, company branding)
  throw new Error('Proposal data builder not yet implemented')
}
