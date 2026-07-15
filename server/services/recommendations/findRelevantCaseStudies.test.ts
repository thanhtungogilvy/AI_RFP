import { describe, expect, it, vi } from 'vitest'
import type { CaseStudy } from '~/types/case-study'
import type { RfpAnalysis } from '~/types/rfp'
import { findRelevantCaseStudies } from './findRelevantCaseStudies'

const analysis: RfpAnalysis = {
  rfpId: 'rfp-1', clientName: 'Bank', industry: 'Banking', businessProblems: [],
  requiredCapabilities: ['Cloud migration'], technicalRequirements: ['99.99% availability'], evaluationCriteria: [],
  summary: 'Cloud migration for banking availability', searchKeywords: ['cloud migration', 'banking'], analyzedAt: '',
}
const caseStudies: CaseStudy[] = [{
  id: 'cs-1', title: 'Bank cloud migration', client: 'Acme', industry: 'Banking', summary: '', tags: [], fileName: '', uploadedAt: '', status: 'indexed',
  slides: [{ slideIndex: 1, title: 'Results', content: 'Cloud migration completed with banking availability.', tags: [] }],
}]

describe('findRelevantCaseStudies', () => {
  it('groups vector slide matches into scored recommendations with excerpts', async () => {
    const result = await findRelevantCaseStudies(analysis, caseStudies, {
      generateEmbedding: vi.fn().mockResolvedValue([0.1]) as any,
      matchSlides: vi.fn().mockResolvedValue([{
        slideId: 'slide-1', caseStudyId: 'cs-1', caseStudyTitle: 'Bank cloud migration', caseStudyClient: 'Acme', caseStudyIndustry: 'Banking',
        slideIndex: 1, slideTitle: 'Results', slideContent: 'Cloud migration completed with banking availability.', similarity: 0.9,
      }]),
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ relevanceScore: 0.9, selected: true, matchedSlideExcerpts: [expect.objectContaining({ slideIndex: 1, similarity: 0.9 })] })
    expect(result[0]?.reasons.join(' ')).toContain('Cloud migration')
  })

  it('falls back to keyword matching when embedding fails', async () => {
    const result = await findRelevantCaseStudies(analysis, caseStudies, {
      generateEmbedding: vi.fn().mockRejectedValue(new Error('offline')) as any,
      matchSlides: vi.fn(),
    })
    expect(result[0]).toMatchObject({ caseStudyId: 'cs-1', selected: true })
    expect(result[0]?.matchedSlideExcerpts[0]?.excerpt).toContain('Cloud migration')
  })
})
