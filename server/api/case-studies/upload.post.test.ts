import { beforeAll, describe, expect, it, vi } from 'vitest'

type Validator = (fileName: string, contentType?: string) => void
let validatePptxUpload: Validator
let handleCaseStudyUpload: (event: any, deps: any) => Promise<unknown>

beforeAll(async () => {
  vi.stubGlobal('createError', (input: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
  )
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readMultipartFormData', vi.fn())
  ;({ validatePptxUpload, handleCaseStudyUpload } = await import('./upload.post'))
})

describe('handleCaseStudyUpload', () => {
  const file = { name: 'file', filename: 'deck.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', data: Buffer.from('pptx') }
  const deps = (overrides = {}) => ({
    readMultipartFormData: vi.fn().mockResolvedValue([file]),
    isSupabaseConfigured: vi.fn().mockReturnValue(true),
    indexCaseStudy: vi.fn().mockResolvedValue({ status: 'indexed', slides: [] }),
    ...overrides,
  })

  it('rejects buffers larger than 50 MiB with 413 before configuration checks', async () => {
    const large = { ...file, data: { length: 50 * 1024 * 1024 + 1 } }
    const testDeps = deps({ readMultipartFormData: vi.fn().mockResolvedValue([large]), isSupabaseConfigured: vi.fn().mockReturnValue(false) })
    await expect(handleCaseStudyUpload({}, testDeps)).rejects.toMatchObject({ statusCode: 413 })
    expect(testDeps.isSupabaseConfigured).not.toHaveBeenCalled()
  })

  it('maps known parser failures to 400', async () => {
    const testDeps = deps({ indexCaseStudy: vi.fn().mockRejectedValue(new Error('Invalid PPTX package')) })
    await expect(handleCaseStudyUpload({}, testDeps)).rejects.toMatchObject({ statusCode: 400, statusMessage: 'Invalid PPTX package' })
  })

  it('preserves the unconfigured Supabase 503 response', async () => {
    await expect(handleCaseStudyUpload({}, deps({ isSupabaseConfigured: vi.fn().mockReturnValue(false) }))).rejects.toMatchObject({ statusCode: 503 })
  })

  it('logs unexpected internals and returns a generic 500', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const testDeps = deps({ indexCaseStudy: vi.fn().mockRejectedValue(Object.assign(new Error('database password leaked'), { statusCode: 500 })) })
    await expect(handleCaseStudyUpload({}, testDeps)).rejects.toMatchObject({ statusCode: 500, statusMessage: 'Case study indexing failed' })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('validatePptxUpload', () => {
  it.each([
    ['deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['DECK.PPTX', 'application/octet-stream'],
  ])('accepts %s with %s', (fileName, contentType) => {
    expect(() => validatePptxUpload(fileName, contentType)).not.toThrow()
  })

  it.each([
    ['deck.pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['deck.pptx', undefined],
    ['deck.pptx', 'application/pdf'],
  ])('rejects %s with %s as HTTP 400', (fileName, contentType) => {
    expect(() => validatePptxUpload(fileName, contentType)).toThrow(expect.objectContaining({ statusCode: 400 }))
  })
})
