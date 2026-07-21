export interface CaseStudySlide {
  slideIndex: number
  title: string
  content: string
  imageUrl?: string
  tags: string[]
}

export interface CaseStudy {
  id: string
  title: string
  client: string
  industry: string
  summary: string
  tags: string[]
  slides: CaseStudySlide[]
  fileName: string
  uploadedAt: string
  status: 'processing' | 'indexed' | 'error'
  embeddingStatus?: 'pending' | 'complete' | 'partial' | 'failed'
  embeddedSlideCount?: number
  totalSlideCount?: number
}
