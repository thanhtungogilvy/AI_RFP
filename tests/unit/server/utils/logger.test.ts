import { describe, expect, it, vi } from 'vitest'
import { redactLogContext, logError } from '#server/utils/logger'

describe('redactLogContext', () => {
  it('redacts credential and document content fields recursively', () => {
    expect(redactLogContext({
      apiKey: 'secret',
      nested: { authorization: 'Bearer token', content: 'RFP confidential text' },
      operation: 'analyze-rfp',
    })).toEqual({
      apiKey: '[REDACTED]',
      nested: { authorization: '[REDACTED]', content: '[REDACTED]' },
      operation: 'analyze-rfp',
    })
  })
})

describe('logError', () => {
  it('emits structured JSON without secret values', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logError('dependency_failure', new Error('secret-token'), { requestId: 'req-1', serviceKey: 'secret-token' })

    const line = String(output.mock.calls[0]?.[0])
    expect(JSON.parse(line)).toMatchObject({ level: 'error', event: 'dependency_failure', requestId: 'req-1', serviceKey: '[REDACTED]' })
    expect(line).not.toContain('secret-token')
    output.mockRestore()
  })
})
