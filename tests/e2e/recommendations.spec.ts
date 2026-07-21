import { expect, test } from '@playwright/test'

const analysis = {
  rfpId: 'rfp-e2e', clientName: 'Example Bank', industry: 'Banking', businessProblems: [],
  requiredCapabilities: ['Cloud migration'], technicalRequirements: ['99.99% uptime'], evaluationCriteria: [],
  summary: 'Modernise the bank platform.', searchKeywords: ['cloud'], analyzedAt: '2026-07-20T00:00:00.000Z',
}

test('selects a recommendation and generates a proposal from the review page', async ({ page }) => {
  await page.route('**/api/capabilities', route => route.fulfill({ json: { supabase: true, chatModel: true, embeddingModel: true, pdfExport: false } }))
  await page.route('**/api/rfps/rfp-e2e/recommendations', route => route.fulfill({ json: {
    analysis,
    recommendations: [{
      id: 'rfp-e2e:case-1', rfpId: 'rfp-e2e', caseStudyId: 'case-1', caseStudyTitle: 'Cloud migration', caseStudyClient: 'Reference Bank', caseStudyIndustry: 'Banking',
      relevanceScore: 0.9, confidenceScore: 0.8, reasons: ['Matches cloud migration evidence.'], matchedRequirements: ['Cloud migration'],
      matchedSlideExcerpts: [{ slideIndex: 1, title: 'Results', excerpt: '99.99% uptime', similarity: 0.9 }], explanationSource: 'ai', selected: true,
    }],
  } }))
  await page.route('**/api/proposals/generate', route => route.fulfill({ json: {
    id: 'proposal-e2e', rfpId: 'rfp-e2e', title: 'Proposal for Example Bank', status: 'completed', selectedCaseStudyIds: ['case-1'],
    pptxUrl: '/api/proposals/proposal-e2e/download?format=pptx', pdfUrl: null, pdfStatus: 'not_requested', createdAt: '2026-07-20T00:00:00.000Z',
  } }))
  await page.route('**/api/proposals/proposal-e2e', route => route.fulfill({ json: {
    id: 'proposal-e2e', rfpId: 'rfp-e2e', title: 'Proposal for Example Bank', status: 'completed', selectedCaseStudyIds: ['case-1'],
    pptxUrl: '/api/proposals/proposal-e2e/download?format=pptx', pdfUrl: null, pdfStatus: 'not_requested', createdAt: '2026-07-20T00:00:00.000Z',
  } }))

  await page.goto('/rfps/rfp-e2e/recommendations')
  await expect(page.getByRole('heading', { name: 'Cloud migration' })).toBeVisible()
  await page.getByRole('button', { name: 'Generate Proposal (1 selected)' }).click({ noWaitAfter: true })
  await expect(page).toHaveURL(/\/proposals\/proposal-e2e$/)
})
