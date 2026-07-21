export interface MatchedSlideExcerpt {
  slideIndex: number
  title: string
  excerpt: string
  similarity: number
}

export interface CaseStudyRecommendation {
  id: string
  rfpId: string
  caseStudyId: string
  caseStudyTitle: string
  caseStudyClient: string
  caseStudyIndustry: string
  relevanceScore: number
  confidenceScore: number
  reasons: string[]
  matchedRequirements: string[]
  matchedSlideExcerpts: MatchedSlideExcerpt[]
  explanationSource: 'ai' | 'fallback'
  explanationWarning?: string
  selected: boolean
}
