export interface ProposalGeneration {
  id: string
  rfpId: string
  title: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  selectedRequirementGroupIds: string[]
  selectedCaseStudyIds: string[]
  pptxUrl: string | null
  pdfUrl: string | null
  pdfStatus?: 'not_requested' | 'completed' | 'error'
  pdfErrorMessage?: string
  createdAt: string
  completedAt?: string
  errorMessage?: string
}
