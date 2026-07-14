import type { CaseStudy } from '~/types/case-study'
import { dbGetCaseStudies, dbSearchCaseStudies } from '../../services/supabase/db'

// Minimal mock used only when Supabase is not configured
const MOCK: CaseStudy[] = [
  {
    id: 'cs-001', title: 'Digital Transformation for Vietcombank', client: 'Vietcombank',
    industry: 'Banking & Finance', summary: 'End-to-end digital banking platform modernisation.',
    tags: ['digital transformation', 'banking', 'cloud', 'microservices'], slides: [],
    fileName: 'vietcombank-digital-transformation.pptx', uploadedAt: '2025-06-01T09:00:00Z', status: 'indexed',
  },
  {
    id: 'cs-002', title: 'AI-Powered Customer Service for Masan Group', client: 'Masan Group',
    industry: 'Retail & FMCG', summary: 'Conversational AI chatbot handling 80% of tier-1 queries.',
    tags: ['AI', 'chatbot', 'customer service', 'retail'], slides: [],
    fileName: 'masan-ai-customer-service.pptx', uploadedAt: '2025-06-15T11:00:00Z', status: 'indexed',
  },
  {
    id: 'cs-003', title: 'Data Platform Modernisation for VinGroup', client: 'VinGroup',
    industry: 'Conglomerate', summary: 'Unified data platform consolidating 20+ silos.',
    tags: ['data platform', 'analytics', 'BI'], slides: [],
    fileName: 'vingroup-data-platform.pptx', uploadedAt: '2025-07-01T08:30:00Z', status: 'indexed',
  },
]

export default defineEventHandler(async (event) => {
  const q = ((getQuery(event).q as string) ?? '').trim()

  if (q) {
    // Supabase text search → mock filter fallback
    const results = await dbSearchCaseStudies(q)
    if (results) return results
    const ql = q.toLowerCase()
    return MOCK.filter(cs =>
      cs.title.toLowerCase().includes(ql) ||
      cs.client.toLowerCase().includes(ql) ||
      cs.industry.toLowerCase().includes(ql) ||
      cs.tags.some(t => t.toLowerCase().includes(ql))
    )
  }

  // No query — return all
  return (await dbGetCaseStudies()) ?? MOCK
})
