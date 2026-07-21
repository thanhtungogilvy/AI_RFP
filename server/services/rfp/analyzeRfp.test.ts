import { describe, expect, it, vi } from 'vitest'
import { analyzeRfp, splitRfpText } from './analyzeRfp'

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

    await expect(analyzeRfp('RFP text', 'rfp-123', { complete, embed: vi.fn() })).resolves.toMatchObject({
      rfpId: 'rfp-123',
      clientName: 'Example Bank',
      requiredCapabilities: ['Cloud migration'],
      searchKeywords: ['banking', 'cloud migration'],
    })
    expect(complete).toHaveBeenCalledOnce()
  })

  it('rejects malformed model output rather than returning untrusted data', async () => {
    await expect(analyzeRfp('RFP text', 'rfp-123', { complete: vi.fn().mockResolvedValue('{invalid'), embed: vi.fn() }))
      .rejects.toThrow('LM Studio returned invalid RFP analysis JSON')
  })

  it('splits long RFP text at paragraph boundaries without losing text', () => {
    const text = `${'a'.repeat(11_900)}\n\n${'b'.repeat(800)}`
    expect(splitRfpText(text, 12_000)).toEqual([`${'a'.repeat(11_900)}`, `${'b'.repeat(800)}`])
  })

  it('merges analyses from multiple RFP chunks', async () => {
    const payload = {
      clientName: 'Example Bank', industry: 'Banking', businessProblems: ['Legacy core platform'],
      requiredCapabilities: ['Cloud migration'], technicalRequirements: ['99.99% availability'],
      evaluationCriteria: ['Relevant delivery experience'], summary: 'Modernise the core platform.', searchKeywords: ['banking'],
    }
    const complete = vi.fn().mockResolvedValue(JSON.stringify(payload))
    const rfpText = `${'First requirement. '.repeat(500)}\n\n${'Second requirement. '.repeat(500)}`

    const result = await analyzeRfp(rfpText, 'rfp-123', { complete, embed: vi.fn() })

    expect(complete).toHaveBeenCalledTimes(2)
    expect(result.requiredCapabilities).toEqual(['Cloud migration'])
  })

  it('rejects RFP text above the explicit maximum rather than truncating it', async () => {
    await expect(analyzeRfp('x'.repeat(240_001), 'rfp-123', { complete: vi.fn(), embed: vi.fn() }))
      .rejects.toThrow('RFP text exceeds the 240,000 character limit')
  })
})
