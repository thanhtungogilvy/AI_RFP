import { describe, expect, it, vi } from 'vitest'
import { AppError, asAppError } from '#server/utils/errors'

describe('asAppError', () => {
  it('converts an unknown dependency failure into a safe public error', () => {
    const error = asAppError(new Error('connection string contains secret-value'))

    expect(error).toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR', publicMessage: 'An unexpected server error occurred.' })
    expect(error.message).not.toContain('secret-value')
  })

  it('preserves declared application errors', () => {
    const original = new AppError(503, 'DEPENDENCY_UNAVAILABLE', 'LM Studio is unavailable.')
    expect(asAppError(original)).toBe(original)
  })
})

describe('AppError', () => {
  it('creates an H3 error with a stable code and request ID', () => {
    vi.stubGlobal('createError', (input: Record<string, unknown>) => input)
    const h3Error = new AppError(503, 'DEPENDENCY_UNAVAILABLE', 'LM Studio is unavailable.').toH3('req-123')

    expect(h3Error).toMatchObject({
      statusCode: 503,
      statusMessage: 'LM Studio is unavailable.',
      data: { code: 'DEPENDENCY_UNAVAILABLE', requestId: 'req-123' },
    })
  })
})
