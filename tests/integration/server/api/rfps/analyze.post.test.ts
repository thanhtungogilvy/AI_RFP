import { beforeAll, describe, expect, it, vi } from 'vitest'
import { LMStudioUnavailableError } from '#server/services/ai/lmStudio'

let handleRfpAnalysis: typeof import('#server/api/rfps/[id]/analyze.post')['handleRfpAnalysis']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: { id?: string } } }, key: string) => event.context.params[key as 'id'])
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  ;({ handleRfpAnalysis } = await import('#server/api/rfps/[id]/analyze.post'))
})

const analysis = {
  rfpId: 'rfp-123', clientName: 'Example Bank', industry: 'Banking',
  businessProblems: ['Legacy platform'], requiredCapabilities: ['Cloud migration'],
  technicalRequirements: ['99.99% availability'], evaluationCriteria: ['Delivery experience'],
  summary: 'Modernise the core banking platform.', searchKeywords: ['banking'], analyzedAt: '2026-07-15T00:00:00.000Z',
}

function deps() {
  return {
    isChatModelConfigured: vi.fn().mockReturnValue(true),
    getRfpInput: vi.fn().mockResolvedValue({ text: 'RFP body' }),
    analyze: vi.fn().mockResolvedValue(analysis),
    saveAnalysis: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  }
}

describe('handleRfpAnalysis', () => {
  it('analyzes persisted RFP text and marks the document analyzed', async () => {
    const testDeps = deps()
    const event = { context: { params: { id: 'rfp-123' } } } as any

    await expect(handleRfpAnalysis(event, testDeps)).resolves.toEqual({ analysis })
    expect(testDeps.analyze).toHaveBeenCalledWith('RFP body', 'rfp-123')
    expect(testDeps.saveAnalysis).toHaveBeenCalledWith('rfp-123', analysis)
    expect(testDeps.updateStatus).toHaveBeenCalledWith('rfp-123', 'analyzed')
  })

  it('returns a graceful 503 and marks the document as error when LM Studio is down', async () => {
    const testDeps = deps()
    testDeps.analyze.mockRejectedValue(new LMStudioUnavailableError())
    const event = { context: { params: { id: 'rfp-123' } } } as any

    await expect(handleRfpAnalysis(event, testDeps)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: expect.stringContaining('LM Studio is unavailable'),
    })
    expect(testDeps.updateStatus).toHaveBeenLastCalledWith('rfp-123', 'error')
  })
})
