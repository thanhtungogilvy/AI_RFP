export interface RfpRequirement {
  id: string
  category: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

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
  summary: string
  requirements: RfpRequirement[]
  keyThemes: string[]
  analyzedAt: string
}
