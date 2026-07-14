import type { CaseStudy } from '~/types/case-study'

export function getCaseStudyPreview(caseStudy: CaseStudy): string {
  return caseStudy.summary.trim()
    || caseStudy.slides.find(slide => slide.content.trim())?.content.trim()
    || 'No extractable slide text'
}
