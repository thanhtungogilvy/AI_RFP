import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PassThrough, Readable } from 'node:stream'

type Validator = (fileName: string, contentType?: string) => void
let validatePptxUpload: Validator
let handleCaseStudyUpload: (event: any, deps: any) => Promise<unknown>
let readBoundedMultipartFormData: (event: any, limit?: number) => Promise<any>

beforeAll(async () => {
  vi.stubGlobal('createError', (input: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
  )
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readMultipartFormData', vi.fn())
  ;({ validatePptxUpload, handleCaseStudyUpload, readBoundedMultipartFormData } = await import('./upload.post'))
})

describe('readBoundedMultipartFormData', () => {
  it('preserves file and text fields for a bounded multipart stream', async () => {
    const boundary = 'test-boundary'
    const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nEvidence\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="deck.pptx"\r\nContent-Type: application/octet-stream\r\n\r\npptx\r\n--${boundary}--\r\n`)
    const req = Readable.from([body.subarray(0, 20), body.subarray(20)]) as any
    req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'transfer-encoding': 'chunked' }
    const parts = await readBoundedMultipartFormData({ method: 'POST', node: { req } }, 1024)
    expect(parts).toEqual([
      { name: 'title', data: Buffer.from('Evidence') },
      { name: 'file', filename: 'deck.pptx', type: 'application/octet-stream', data: Buffer.from('pptx') },
    ])
  })

  it('rejects an oversized chunked stream as soon as the limit is crossed', async () => {
    let finalChunkWritten = false
    const req = new PassThrough() as any
    req.headers = { 'content-type': 'multipart/form-data; boundary=x', 'transfer-encoding': 'chunked' }
    req.write(Buffer.alloc(6))
    req.write(Buffer.alloc(6))
    const timer = setTimeout(() => {
      finalChunkWritten = true
      req.end(Buffer.alloc(6))
    }, 100)
    await expect(readBoundedMultipartFormData({ method: 'POST', node: { req } }, 10)).rejects.toMatchObject({ statusCode: 413 })
    clearTimeout(timer)
    expect(finalChunkWritten).toBe(false)
    expect(req.destroyed).toBe(false)
    expect(req.isPaused()).toBe(true)
  })
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
