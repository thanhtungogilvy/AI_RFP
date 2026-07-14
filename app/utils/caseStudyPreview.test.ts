import { describe, expect, it } from 'vitest'
import type { CaseStudy } from '~/types/case-study'
import { getCaseStudyPreview } from './caseStudyPreview'

const base = {
  id: 'cs-1',
  title: 'Example',
  client: 'Client',
  industry: '',
  tags: [],
  fileName: 'example.pptx',
  uploadedAt: '2026-07-14T00:00:00Z',
  status: 'indexed',
} satisfies Omit<CaseStudy, 'summary' | 'slides'>

describe('getCaseStudyPreview', () => {
  it('prefers an explicit summary', () => {
    expect(getCaseStudyPreview({
      ...base,
      summary: 'Summary',
      slides: [{ slideIndex: 1, title: 'Title', content: 'Slide content', tags: [] }],
    })).toBe('Summary')
  })

  it('falls back to the first non-empty extracted slide', () => {
    expect(getCaseStudyPreview({
      ...base,
      summary: '',
      slides: [
        { slideIndex: 1, title: '', content: '', tags: [] },
        { slideIndex: 2, title: 'Impact', content: 'Reduced cost by 20%', tags: [] },
      ],
    })).toBe('Reduced cost by 20%')
  })
})
