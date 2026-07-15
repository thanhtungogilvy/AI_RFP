import { describe, expect, it, vi } from 'vitest'
import { analyzeRfp } from './analyzeRfp'

describe('analyzeRfp', () => {
  it('returns a validated strict RFP analysis from the model JSON', async () => {
    const complete = vi.fn().mockResolvedValue(JSON.stringify({
      clientName: 'Example Bank',
      industry: 'Banking',
      businessProblems: ['Legacy core platform'],
      requiredCapabilities: ['Cloud migration'],
      technicalRequirements: ['99.99% availability'],
      evaluationCriteria: ['Relevant delivery experience'],
      summary: 'Modernise the core platform.',
      searchKeywords: ['banking', 'cloud migration'],
    }))

    await expect(analyzeRfp('RFP text', 'rfp-123', { complete })).resolves.toMatchObject({
      rfpId: 'rfp-123',
      clientName: 'Example Bank',
      requiredCapabilities: ['Cloud migration'],
      searchKeywords: ['banking', 'cloud migration'],
    })
    expect(complete).toHaveBeenCalledOnce()
  })

  it('rejects malformed model output rather than returning untrusted data', async () => {
    await expect(analyzeRfp('RFP text', 'rfp-123', { complete: vi.fn().mockResolvedValue('{invalid') }))
      .rejects.toThrow('LM Studio returned invalid RFP analysis JSON')
  })
})
