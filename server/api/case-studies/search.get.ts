import type { CaseStudy } from '~/types/case-study'

const mockCaseStudies: CaseStudy[] = [
  {
    id: 'cs-001',
    title: 'Digital Transformation for Vietcombank',
    client: 'Vietcombank',
    industry: 'Banking & Finance',
    summary: 'End-to-end digital banking platform modernisation.',
    tags: ['digital transformation', 'banking', 'cloud', 'microservices'],
    slides: [],
    fileName: 'vietcombank-digital-transformation.pptx',
    uploadedAt: '2025-06-01T09:00:00Z',
    status: 'indexed',
  },
  {
    id: 'cs-002',
    title: 'AI-Powered Customer Service for Masan Group',
    client: 'Masan Group',
    industry: 'Retail & FMCG',
    summary: 'Conversational AI chatbot handling 80% of tier-1 queries.',
    tags: ['AI', 'chatbot', 'customer service', 'retail'],
    slides: [],
    fileName: 'masan-ai-customer-service.pptx',
    uploadedAt: '2025-06-15T11:00:00Z',
    status: 'indexed',
  },
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string | undefined)?.toLowerCase() ?? ''

  // TODO: Replace with vector similarity search against Supabase pgvector

  if (!q) return mockCaseStudies

  return mockCaseStudies.filter(
    (cs) =>
      cs.title.toLowerCase().includes(q) ||
      cs.client.toLowerCase().includes(q) ||
      cs.industry.toLowerCase().includes(q) ||
      cs.tags.some((t) => t.toLowerCase().includes(q))
  )
})
