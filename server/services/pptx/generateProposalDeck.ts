// TODO: Install pptxgenjs: npm install pptxgenjs

// import pptxgen from 'pptxgenjs'
import type { CaseStudy } from '~/types/case-study'
import type { RfpDocument } from '~/types/rfp'

export interface ProposalDeckData {
  rfp: RfpDocument
  caseStudies: CaseStudy[]
  title: string
}

/**
 * Generate a PPTX proposal deck buffer from assembled proposal data.
 * TODO: Implement slide templates and pptxgenjs integration
 */
export async function generateProposalDeck(_data: ProposalDeckData): Promise<Buffer> {
  // TODO: Create a new pptxgen presentation
  // TODO: Add cover slide with RFP title and client name
  // TODO: Add executive summary slide
  // TODO: For each selected case study, add relevant slides
  // TODO: Add closing / next steps slide
  // TODO: Return the PPTX as a Buffer
  throw new Error('Proposal deck generation not yet implemented')
}
