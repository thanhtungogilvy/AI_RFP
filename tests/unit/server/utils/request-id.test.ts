import { describe, expect, it, vi } from 'vitest'
import { ensureRequestId } from '#server/utils/request-id'

describe('ensureRequestId', () => {
  it('reuses a valid inbound request ID and otherwise creates one', () => {
    const existing = { context: { requestId: 'req-existing' } } as any
    expect(ensureRequestId(existing)).toBe('req-existing')

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('req-generated')
    const generated = { context: {} } as any
    expect(ensureRequestId(generated)).toBe('req-generated')
    expect(generated.context.requestId).toBe('req-generated')
  })
})
