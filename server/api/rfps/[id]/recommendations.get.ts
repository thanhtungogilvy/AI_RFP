import type { RfpAnalysis } from '~/types/rfp'
import type { CaseStudyRecommendation } from '~/types/recommendation'
import { dbGetRfpAnalysis } from '../../../services/supabase/db'

export default defineEventHandler(async (event) => {
  const rfpId = getRouterParam(event, 'id')

  // TODO: Fetch real RfpAnalysis from Supabase DB
  // TODO: Call server/services/recommendations/findRelevantCaseStudies.ts

  const mockAnalysis: RfpAnalysis = {
    rfpId: rfpId!,
    clientName: 'ABC Bank',
    industry: 'Banking & Finance',
    businessProblems: ['Legacy core banking limits change velocity'],
    requiredCapabilities: ['Cloud-native architecture', 'Zero-downtime deployment', 'Regulatory compliance'],
    technicalRequirements: ['AWS or Azure', 'Open API / ISO 20022', '99.99% SLA'],
    evaluationCriteria: ['Relevant banking delivery experience'],
    summary:
      'The client is seeking a vendor to modernise their core banking infrastructure with a focus on scalability, 24/7 availability, regulatory compliance, and integration with third-party fintech services.',
    searchKeywords: ['cloud migration', 'banking modernisation', 'compliance', 'high availability', 'open banking'],
    analyzedAt: new Date().toISOString(),
  }
  const analysis = await dbGetRfpAnalysis(rfpId!) ?? mockAnalysis

  const recommendations: CaseStudyRecommendation[] = [
    {
      id: 'rec-001',
      rfpId: rfpId!,
      caseStudyId: 'cs-001',
      caseStudyTitle: 'Digital Transformation for Vietcombank',
      caseStudyClient: 'Vietcombank',
      caseStudyIndustry: 'Banking & Finance',
      relevanceScore: 0.95,
      confidenceScore: 0.91,
      reasons: [
        'Same industry vertical (Banking & Finance)',
        'Proven cloud-native microservices migration experience',
        'Achieved 99.99% uptime matching client SLA requirement',
        'Experience with Vietnamese banking regulatory compliance',
      ],
      matchedRequirements: ['req-1', 'req-2', 'req-3', 'req-6'],
      selected: true,
    },
    {
      id: 'rec-002',
      rfpId: rfpId!,
      caseStudyId: 'cs-003',
      caseStudyTitle: 'Data Platform Modernisation for VinGroup',
      caseStudyClient: 'VinGroup',
      caseStudyIndustry: 'Conglomerate',
      relevanceScore: 0.72,
      confidenceScore: 0.68,
      reasons: [
        'Demonstrates large-scale cloud architecture capability',
        'Azure cloud platform experience aligns with RFP requirements',
        'Proven ability to deliver complex enterprise transformations',
      ],
      matchedRequirements: ['req-1', 'req-4'],
      selected: false,
    },
    {
      id: 'rec-003',
      rfpId: rfpId!,
      caseStudyId: 'cs-002',
      caseStudyTitle: 'AI-Powered Customer Service for Masan Group',
      caseStudyClient: 'Masan Group',
      caseStudyIndustry: 'Retail & FMCG',
      relevanceScore: 0.45,
      confidenceScore: 0.40,
      reasons: [
        'Demonstrates AI/ML delivery capability',
        'Shows experience with high-volume API integrations',
      ],
      matchedRequirements: ['req-4'],
      selected: false,
    },
  ]

  return { analysis, recommendations }
})
