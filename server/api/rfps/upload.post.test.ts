import { beforeAll, describe, expect, it, vi } from 'vitest'

let handleRfpUpload: (event: any, deps: any) => Promise<unknown>

beforeAll(async () => {
  vi.stubGlobal('createError', (input: { statusCode: number, statusMessage: string }) => Object.assign(new Error(input.statusMessage), input))
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  ;({ handleRfpUpload } = await import('./upload.post'))
})

const pdf = { name: 'file', filename: 'rfp.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.7\nRFP text') }

function deps(overrides = {}) {
  return {
    readMultipartFormData: vi.fn().mockResolvedValue([pdf]),
    isSupabaseConfigured: vi.fn().mockReturnValue(true),
    extractRfpText: vi.fn().mockResolvedValue('RFP text'),
    insertRfp: vi.fn().mockResolvedValue({ id: 'rfp-1', status: 'uploaded' }),
    uploadFile: vi.fn().mockResolvedValue('rfp-1/rfp.pdf'),
    updateFilePath: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('handleRfpUpload', () => {
  it('persists a validated PDF and its original artifact', async () => {
    const testDeps = deps()
    await expect(handleRfpUpload({}, testDeps)).resolves.toMatchObject({ id: 'rfp-1' })
    expect(testDeps.insertRfp).toHaveBeenCalledWith(expect.objectContaining({ content: 'RFP text', fileName: 'rfp.pdf' }))
    expect(testDeps.uploadFile).toHaveBeenCalledWith('rfps', 'rfp-1/rfp.pdf', pdf.data, 'application/pdf')
  })

  it('rejects unsupported legacy DOC files before persistence', async () => {
    const testDeps = deps({ readMultipartFormData: vi.fn().mockResolvedValue([{ ...pdf, filename: 'rfp.doc', type: 'application/msword' }]) })
    await expect(handleRfpUpload({}, testDeps)).rejects.toMatchObject({ statusCode: 400 })
    expect(testDeps.insertRfp).not.toHaveBeenCalled()
  })

  it('rejects an invalid PDF signature before text extraction', async () => {
    const testDeps = deps({ readMultipartFormData: vi.fn().mockResolvedValue([{ ...pdf, data: Buffer.from('not a PDF') }]) })
    await expect(handleRfpUpload({}, testDeps)).rejects.toMatchObject({ statusCode: 400 })
    expect(testDeps.extractRfpText).not.toHaveBeenCalled()
  })

  it('reports an image-only PDF as an unprocessable document', async () => {
    await expect(handleRfpUpload({}, deps({
      extractRfpText: vi.fn().mockRejectedValue(new Error('The RFP document contains no extractable text')),
    }))).rejects.toMatchObject({ statusCode: 422 })
  })

  it('returns 503 instead of returning an unpersisted mock RFP', async () => {
    await expect(handleRfpUpload({}, deps({ isSupabaseConfigured: vi.fn().mockReturnValue(false) }))).rejects.toMatchObject({ statusCode: 503 })
  })
})
