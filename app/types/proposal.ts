export interface ProposalGeneration {
  id: string
  rfpId: string
  title: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  selectedCaseStudyIds: string[]
  pptxUrl: string | null
  pdfUrl: string | null
  createdAt: string
  completedAt?: string
  errorMessage?: string
}
