import type { CaseStudy } from '~/types/case-study'
import { dbGetCaseStudies } from '../../services/supabase/db'

const MOCK: CaseStudy[] = [
  {
    id: 'cs-001',
    title: 'Digital Transformation for Vietcombank',
    client: 'Vietcombank',
    industry: 'Banking & Finance',
    summary: 'End-to-end digital banking platform modernisation, replacing legacy core systems with cloud-native microservices.',
    tags: ['digital transformation', 'banking', 'cloud', 'microservices'],
    slides: [
      { slideIndex: 0, title: 'Executive Summary', content: 'Modernised core banking platform for 10M+ customers.', tags: ['summary'] },
      { slideIndex: 1, title: 'Challenge', content: 'Legacy monolithic system causing 2-hour daily downtime.', tags: ['challenge'] },
      { slideIndex: 2, title: 'Solution', content: 'Cloud-native microservices on AWS with zero-downtime deployment.', tags: ['solution', 'cloud'] },
      { slideIndex: 3, title: 'Results', content: '99.99% uptime, 40% cost reduction, 3x faster time-to-market.', tags: ['results'] },
    ],
    fileName: 'vietcombank-digital-transformation.pptx',
    uploadedAt: '2025-06-01T09:00:00Z',
    status: 'indexed',
  },
  {
    id: 'cs-002',
    title: 'AI-Powered Customer Service for Masan Group',
    client: 'Masan Group',
    industry: 'Retail & FMCG',
    summary: 'Deployed conversational AI chatbot handling 80% of tier-1 customer queries across multiple channels.',
    tags: ['AI', 'chatbot', 'customer service', 'retail', 'NLP'],
    slides: [
      { slideIndex: 0, title: 'Overview', content: 'AI chatbot serving 500k monthly interactions.', tags: ['overview'] },
      { slideIndex: 1, title: 'Technology', content: 'LLM-based NLP pipeline with RAG architecture.', tags: ['AI', 'technology'] },
      { slideIndex: 2, title: 'Outcomes', content: '80% query deflection, CSAT increased from 3.2 to 4.6.', tags: ['results'] },
    ],
    fileName: 'masan-ai-customer-service.pptx',
    uploadedAt: '2025-06-15T11:00:00Z',
    status: 'indexed',
  },
  {
    id: 'cs-003',
    title: 'Data Platform Modernisation for VinGroup',
    client: 'VinGroup',
    industry: 'Conglomerate',
    summary: 'Unified enterprise data platform consolidating 20+ data silos into a single source of truth.',
    tags: ['data platform', 'analytics', 'data warehouse', 'BI'],
    slides: [
      { slideIndex: 0, title: 'Background', content: '20+ fragmented data sources across business units.', tags: ['background'] },
      { slideIndex: 1, title: 'Architecture', content: 'Lakehouse on Azure with dbt, Databricks, and Power BI.', tags: ['technology'] },
      { slideIndex: 2, title: 'Impact', content: 'Data-driven decisions reduced inventory costs by 18%.', tags: ['results'] },
    ],
    fileName: 'vingroup-data-platform.pptx',
    uploadedAt: '2025-07-01T08:30:00Z',
    status: 'indexed',
  },
]

export default defineEventHandler(async () => {
  return (await dbGetCaseStudies()) ?? MOCK
})
