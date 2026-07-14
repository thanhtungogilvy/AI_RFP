import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProposalGeneration } from '~/types/proposal'
import type { CaseStudy } from '~/types/case-study'
import type { RfpDocument, RfpAnalysis } from '~/types/rfp'
import { generateProposalDeck } from '../pptx/generateProposalDeck'
import { dbGetCaseStudyById, dbGetRfpById, dbInsertProposal } from '../supabase/db'

// ── Local file storage ────────────────────────────────────────────────────────

export function getProposalsDir(): string {
  return join(process.cwd(), '.generated', 'proposals')
}

export function getPptxPath(proposalId: string): string {
  return join(getProposalsDir(), `${proposalId}.pptx`)
}

// ── Mock data (fallback when Supabase is not configured) ──────────────────────

const MOCK_RFPS: RfpDocument[] = [
  {
    id: 'rfp-001',
    title: 'Core Banking System Modernisation RFP',
    client: 'ABC Bank',
    industry: 'Banking & Finance',
    deadline: '2025-09-30',
    fileName: 'abc-bank-core-banking-rfp.pdf',
    uploadedAt: '2025-07-10T09:00:00Z',
    status: 'analyzed',
  },
  {
    id: 'rfp-002',
    title: 'AI Customer Engagement Platform',
    client: 'RetailCo Vietnam',
    industry: 'Retail',
    deadline: '2025-08-15',
    fileName: 'retailco-ai-engagement-rfp.pdf',
    uploadedAt: '2025-07-12T14:00:00Z',
    status: 'uploaded',
  },
]

const MOCK_CASE_STUDIES: CaseStudy[] = [
  {
    id: 'cs-001',
    title: 'Digital Transformation for Vietcombank',
    client: 'Vietcombank',
    industry: 'Banking & Finance',
    summary: 'End-to-end digital banking platform modernisation, replacing legacy core systems with cloud-native microservices.',
    tags: ['digital transformation', 'banking', 'cloud', 'microservices'],
    slides: [
      { slideIndex: 0, title: 'Executive Summary', content: 'Modernised core banking platform for 10M+ customers.', tags: ['summary'] },
      { slideIndex: 1, title: 'Challenge', content: 'Legacy monolithic system causing 2-hour daily downtime and preventing new product launches.', tags: ['challenge'] },
      { slideIndex: 2, title: 'Solution', content: 'Cloud-native microservices on AWS with zero-downtime blue/green deployment pipeline and event-driven architecture.', tags: ['solution', 'cloud'] },
      { slideIndex: 3, title: 'Results', content: '99.99% uptime achieved. 40% reduction in infrastructure costs. 3x faster time-to-market for new products.', tags: ['results'] },
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
      { slideIndex: 0, title: 'Overview', content: 'AI chatbot serving 500k monthly interactions across web, mobile, and LINE channels.', tags: ['overview'] },
      { slideIndex: 1, title: 'Technology', content: 'LLM-based NLP pipeline with RAG architecture, integrated with existing CRM and order management systems.', tags: ['AI', 'technology'] },
      { slideIndex: 2, title: 'Results', content: '80% query deflection from human agents. CSAT increased from 3.2 to 4.6 (out of 5). Cost per interaction reduced by 65%.', tags: ['results'] },
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
      { slideIndex: 0, title: 'Background', content: '20+ fragmented data sources across 8 business units with no unified view of the business.', tags: ['background'] },
      { slideIndex: 1, title: 'Solution', content: 'Lakehouse architecture on Azure using dbt for transformation, Databricks for processing, and Power BI for self-service analytics.', tags: ['technology'] },
      { slideIndex: 2, title: 'Results', content: 'Data-driven decisions reduced inventory costs by 18%. Finance close cycle cut from 12 days to 3 days. 250+ active Power BI reports across the group.', tags: ['results'] },
    ],
    fileName: 'vingroup-data-platform.pptx',
    uploadedAt: '2025-07-01T08:30:00Z',
    status: 'indexed',
  },
]

const MOCK_ANALYSIS: RfpAnalysis = {
  rfpId: 'rfp-001',
  summary:
    'The client is seeking a vendor to modernise their core banking infrastructure with a focus on scalability, 24/7 availability, regulatory compliance, and integration with third-party fintech services.',
  requirements: [
    { id: 'req-1', category: 'Technical',    description: 'Cloud-native architecture on AWS or Azure', priority: 'high' },
    { id: 'req-2', category: 'Technical',    description: 'Zero-downtime deployment capability', priority: 'high' },
    { id: 'req-3', category: 'Compliance',   description: 'SBV regulatory compliance (Circular 09/2020)', priority: 'high' },
    { id: 'req-4', category: 'Integration',  description: 'Open API / ISO 20022 support for third-party integrations', priority: 'medium' },
    { id: 'req-5', category: 'Security',     description: 'End-to-end encryption and SOC 2 Type II certification', priority: 'high' },
    { id: 'req-6', category: 'Performance',  description: '99.99% SLA with <200ms API response time', priority: 'medium' },
  ],
  keyThemes: ['cloud migration', 'banking modernisation', 'compliance', 'high availability', 'open banking'],
  analyzedAt: new Date().toISOString(),
}

// ── Data fetchers (Supabase → mock fallback) ──────────────────────────────────

async function getRfp(rfpId: string): Promise<RfpDocument | undefined> {
  return (await dbGetRfpById(rfpId)) ?? MOCK_RFPS.find(r => r.id === rfpId)
}

async function getCaseStudies(ids: string[]): Promise<CaseStudy[]> {
  if (!ids.length) return MOCK_CASE_STUDIES

  const resolved = await Promise.all(
    ids.map(id => dbGetCaseStudyById(id))
  )

  // If any were resolved from Supabase, use those; fall back to mock for nulls
  const mixed = resolved.map((cs, i) => cs ?? MOCK_CASE_STUDIES.find(m => m.id === ids[i]))
  return mixed.filter(Boolean) as CaseStudy[]
}

function getAnalysis(rfpId: string): RfpAnalysis | undefined {
  return rfpId === 'rfp-001' ? MOCK_ANALYSIS : undefined
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Generates a PPTX proposal deck, saves it to disk, and persists the record
 * in Supabase (if configured).
 */
export async function generateProposal(
  rfpId: string,
  selectedCaseStudyIds: string[]
): Promise<ProposalGeneration> {
  const proposalId  = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now         = new Date().toISOString()

  const rfp         = await getRfp(rfpId)
  if (!rfp) {
    throw createError({
      statusCode: 400,
      statusMessage: `RFP ${rfpId} not found`,
    })
  }
  const caseStudies = await getCaseStudies(selectedCaseStudyIds)
  const analysis    = getAnalysis(rfpId)
  const title       = `Proposal for ${rfp.client}`

  // Generate PPTX buffer
  const buffer = await generateProposalDeck({ rfp, analysis, caseStudies, title })

  // Save to local disk
  const dir = getProposalsDir()
  await mkdir(dir, { recursive: true })
  await writeFile(getPptxPath(proposalId), buffer)

  const proposal: ProposalGeneration = {
    id:                   proposalId,
    rfpId,
    title,
    status:               'completed',
    selectedCaseStudyIds,
    pptxUrl:              `/api/proposals/${proposalId}/download?format=pptx`,
    pdfUrl:               null,
    createdAt:            now,
    completedAt:          new Date().toISOString(),
  }

  // Persist record to Supabase (non-blocking — failure doesn't break the response)
  await dbInsertProposal(proposal)

  return proposal
}
