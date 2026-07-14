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
  selected: boolean
}
