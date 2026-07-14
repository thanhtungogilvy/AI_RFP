import type { RfpAnalysis } from '~/types/rfp'
import type { CaseStudyRecommendation } from '~/types/recommendation'

export default defineEventHandler(async (event) => {
  const rfpId = getRouterParam(event, 'id')

  // TODO: Fetch real RfpAnalysis from Supabase DB
  // TODO: Call server/services/recommendations/findRelevantCaseStudies.ts

  const analysis: RfpAnalysis = {
    rfpId: rfpId!,
    summary:
      'The client is seeking a vendor to modernise their core banking infrastructure with a focus on scalability, 24/7 availability, regulatory compliance, and integration with third-party fintech services.',
    requirements: [
      { id: 'req-1', category: 'Technical', description: 'Cloud-native architecture on AWS or Azure', priority: 'high' },
      { id: 'req-2', category: 'Technical', description: 'Zero-downtime deployment capability', priority: 'high' },
      { id: 'req-3', category: 'Compliance', description: 'SBV regulatory compliance (Circular 09/2020)', priority: 'high' },
      { id: 'req-4', category: 'Integration', description: 'Open API / ISO 20022 support for third-party integrations', priority: 'medium' },
      { id: 'req-5', category: 'Security', description: 'End-to-end encryption and SOC 2 Type II certification', priority: 'high' },
      { id: 'req-6', category: 'Performance', description: '99.99% SLA with <200ms API response time', priority: 'medium' },
    ],
    keyThemes: ['cloud migration', 'banking modernisation', 'compliance', 'high availability', 'open banking'],
    analyzedAt: new Date().toISOString(),
  }

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
