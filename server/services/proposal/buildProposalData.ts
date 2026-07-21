import type { RfpAnalysis, RfpDocument } from '~/types/rfp'
import type { CaseStudy } from '~/types/case-study'
import type { ProposalDeckData } from '../pptx/generateProposalDeck'

/**
 * Assemble deterministic proposal content from persisted RFP analysis and selected evidence.
 */
export function buildProposalData(
  rfp: RfpDocument,
  analysis: RfpAnalysis,
  selectedCaseStudies: CaseStudy[],
): ProposalDeckData {
  const terms = [...analysis.searchKeywords, ...analysis.requiredCapabilities, ...analysis.technicalRequirements]
    .map(value => value.toLowerCase()).filter(Boolean)
  const caseStudies = selectedCaseStudies.map(caseStudy => {
    const sorted = [...caseStudy.slides].sort((a, b) => {
      const score = (slide: CaseStudy['slides'][number]) => {
        const text = `${slide.title} ${slide.content}`.toLowerCase()
        return terms.filter(term => text.includes(term)).length
      }
      return score(b) - score(a)
    })
    const evidence = sorted.filter(slide => slide.content.trim()).slice(0, 3)
    return {
      ...caseStudy,
      summary: caseStudy.summary || evidence.map(slide => slide.content).join(' ').slice(0, 600),
      slides: evidence.length ? evidence : caseStudy.slides.slice(0, 3),
    }
  })
  return { rfp, analysis, caseStudies, title: `Proposal for ${rfp.client}` }
}
