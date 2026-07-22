import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { CaseStudy } from '~/types/case-study'
import type { RfpAnalysis, RfpDocument } from '~/types/rfp'
import { generateProposal } from '#server/services/proposal/generateProposal'

beforeAll(() => {
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
})

const rfp: RfpDocument = { id: 'rfp-1', title: 'Modernisation', client: 'Example Bank', industry: 'Banking', fileName: 'rfp.pdf', uploadedAt: '', status: 'analyzed' }
const analysis: RfpAnalysis = { rfpId: 'rfp-1', clientName: 'Example Bank', industry: 'Banking', businessProblems: [], requiredCapabilities: ['Cloud migration'], technicalRequirements: ['99.99% uptime'], evaluationCriteria: [], summary: 'Modernise the bank platform.', searchKeywords: ['cloud'], analyzedAt: '' }
const caseStudy: CaseStudy = { id: 'case-1', title: 'Cloud migration', client: 'Reference Bank', industry: 'Banking', summary: '', tags: [], fileName: 'case.pptx', uploadedAt: '', status: 'indexed', slides: [{ slideIndex: 1, title: 'Cloud result', content: 'Cloud migration achieved 99.99% uptime.', tags: [] }] }

function deps(overrides = {}) {
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    getRfp: vi.fn().mockResolvedValue(rfp),
    getAnalysis: vi.fn().mockResolvedValue(analysis),
    getCaseStudies: vi.fn().mockResolvedValue([caseStudy]),
    findRelevant: vi.fn().mockResolvedValue([{
      id: 'rfp-1:capability:cloud migration',
      rfpId: 'rfp-1',
      requirement: 'Cloud migration',
      requirementType: 'capability',
      relevanceScore: 0.9,
      confidenceScore: 0.82,
      reasons: ['Cloud migration evidence'],
      matchedRequirements: ['Cloud migration'],
      matchedCaseStudies: [{ caseStudyId: 'case-1', caseStudyTitle: 'Cloud migration', caseStudyClient: 'Reference Bank', caseStudyIndustry: 'Banking', relevanceScore: 0.9 }],
      matchedSlideExcerpts: [{ caseStudyId: 'case-1', caseStudyTitle: 'Cloud migration', caseStudyClient: 'Reference Bank', caseStudyIndustry: 'Banking', slideIndex: 1, title: 'Cloud result', excerpt: 'Cloud migration achieved 99.99% uptime.', similarity: 0.9 }],
      explanationSource: 'ai',
      selected: true,
    }]),
    insertProposal: vi.fn().mockResolvedValue(undefined),
    updateProposal: vi.fn().mockResolvedValue(undefined),
    generateDeck: vi.fn().mockResolvedValue(Buffer.from('pptx')),
    uploadFile: vi.fn().mockResolvedValue('proposal-1/proposal.pptx'),
    newId: () => 'proposal-1',
    ...overrides,
  }
}

describe('generateProposal', () => {
  it('uses persisted analysis and exactly the selected indexed case studies before uploading the PPTX artifact', async () => {
    const testDeps = deps()
    const proposal = await generateProposal({ rfpId: 'rfp-1', selectedRequirementGroupIds: ['rfp-1:capability:cloud migration'] }, testDeps as any)

    expect(testDeps.generateDeck).toHaveBeenCalledWith(expect.objectContaining({ rfp, analysis, caseStudies: [expect.objectContaining({ id: 'case-1' })] }))
    expect(testDeps.uploadFile).toHaveBeenCalledWith('proposals', 'proposal-1/proposal.pptx', Buffer.from('pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    expect(testDeps.updateProposal).toHaveBeenCalledWith('proposal-1', expect.objectContaining({ status: 'completed', pptxPath: 'proposal-1/proposal.pptx' }))
    expect(proposal).toMatchObject({
      id: 'proposal-1',
      rfpId: 'rfp-1',
      selectedRequirementGroupIds: ['rfp-1:capability:cloud migration'],
      selectedCaseStudyIds: ['case-1'],
      pdfStatus: 'not_requested',
    })
  })

  it('rejects empty selections before creating a proposal', async () => {
    const testDeps = deps()
    await expect(generateProposal({ rfpId: 'rfp-1', selectedRequirementGroupIds: [] }, testDeps as any)).rejects.toMatchObject({ statusCode: 400 })
    expect(testDeps.insertProposal).not.toHaveBeenCalled()
  })

  it('marks a proposal as error when artifact upload fails', async () => {
    const testDeps = deps({ uploadFile: vi.fn().mockRejectedValue(new Error('storage unavailable: secret-token')) })
    await expect(generateProposal({ rfpId: 'rfp-1', selectedRequirementGroupIds: ['rfp-1:capability:cloud migration'] }, testDeps as any)).rejects.toThrow('storage unavailable: secret-token')
    expect(testDeps.updateProposal).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
      status: 'error', errorMessage: 'An unexpected server error occurred.',
    }))
  })

  it('rejects requested PDF export before creating a proposal when the converter is unavailable', async () => {
    const testDeps = deps({ canExportPdf: vi.fn().mockReturnValue(false) })
    await expect(generateProposal({ rfpId: 'rfp-1', selectedRequirementGroupIds: ['rfp-1:capability:cloud migration'], includePdf: true }, testDeps as any)).rejects.toMatchObject({ statusCode: 422 })
    expect(testDeps.insertProposal).not.toHaveBeenCalled()
  })

  it('keeps the PPTX completed when optional PDF conversion fails', async () => {
    const testDeps = deps({ canExportPdf: vi.fn().mockReturnValue(true), convertPdf: vi.fn().mockRejectedValue(new Error('converter failed')) })
    const proposal = await generateProposal({ rfpId: 'rfp-1', selectedRequirementGroupIds: ['rfp-1:capability:cloud migration'], includePdf: true }, testDeps as any)
    expect(proposal).toMatchObject({ status: 'completed', pdfStatus: 'error', pdfErrorMessage: 'PDF conversion failed' })
  })
})
