export interface RfpDocument {
  id: string
  title: string
  client: string
  industry: string
  deadline?: string
  fileName: string
  uploadedAt: string
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
}

export interface RfpAnalysis {
  rfpId: string
  clientName: string
  industry: string
  businessProblems: string[]
  requiredCapabilities: string[]
  technicalRequirements: string[]
  evaluationCriteria: string[]
  summary: string
  searchKeywords: string[]
  analyzedAt: string
}
