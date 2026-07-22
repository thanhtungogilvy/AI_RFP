import type { RfpAnalysis, RfpDocument } from '~/types/rfp'
import type { CaseStudy } from '~/types/case-study'
import type { RequirementRecommendation } from '~/types/recommendation'
import type { ProposalDeckData } from '../pptx/generateProposalDeck'

/**
 * Assemble deterministic proposal content from persisted RFP analysis and selected evidence.
 */
export function buildProposalData(
  rfp: RfpDocument,
  analysis: RfpAnalysis,
  selectedRequirementGroups: RequirementRecommendation[],
  selectedCaseStudies: CaseStudy[],
): ProposalDeckData {
  const terms = [...analysis.searchKeywords, ...analysis.requiredCapabilities, ...analysis.technicalRequirements]
    .map(value => value.toLowerCase()).filter(Boolean)

  const evidenceByCaseStudy = new Map<string, Set<number>>()
  for (const group of selectedRequirementGroups) {
    for (const slide of group.matchedSlideExcerpts) {
      const set = evidenceByCaseStudy.get(slide.caseStudyId) ?? new Set<number>()
      set.add(slide.slideIndex)
      evidenceByCaseStudy.set(slide.caseStudyId, set)
    }
  }

  const caseStudies = selectedCaseStudies.map(caseStudy => {
    const selectedIndexes = evidenceByCaseStudy.get(caseStudy.id)
    const fromRequirements = selectedIndexes
      ? caseStudy.slides.filter(slide => selectedIndexes.has(slide.slideIndex))
      : []

    const sorted = [...(fromRequirements.length ? fromRequirements : caseStudy.slides)].sort((a, b) => {
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

  return {
    rfp,
    analysis,
    requirementGroups: selectedRequirementGroups,
    caseStudies,
    title: `Proposal for ${rfp.client}`,
  }
}
