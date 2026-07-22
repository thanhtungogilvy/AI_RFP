export interface MatchedSlideExcerpt {
  caseStudyId: string
  caseStudyTitle: string
  caseStudyClient: string
  caseStudyIndustry: string
  slideIndex: number
  title: string
  excerpt: string
  similarity: number
}

export interface RequirementSupportingCaseStudy {
  caseStudyId: string
  caseStudyTitle: string
  caseStudyClient: string
  caseStudyIndustry: string
  relevanceScore: number
}

export interface RequirementRecommendation {
  id: string
  rfpId: string
  requirement: string
  requirementType: 'capability' | 'technical' | 'evaluation' | 'keyword'
  relevanceScore: number
  confidenceScore: number
  reasons: string[]
  matchedRequirements: string[]
  matchedCaseStudies: RequirementSupportingCaseStudy[]
  matchedSlideExcerpts: MatchedSlideExcerpt[]
  explanationSource: 'ai' | 'fallback'
  explanationWarning?: string
  selected: boolean
}
