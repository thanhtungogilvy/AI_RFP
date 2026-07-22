import { beforeAll, describe, expect, it, vi } from 'vitest'

let handleReplaceRfpFile: typeof import('#server/api/rfps/[id]/file.put')['handleReplaceRfpFile']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: { id?: string } } }, key: string) => event.context.params[key as 'id'])
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  ;({ handleReplaceRfpFile } = await import('#server/api/rfps/[id]/file.put'))
})

describe('handleReplaceRfpFile', () => {
  it('replaces an active file then re-analyzes the RFP', async () => {
    const file = { name: 'file', filename: 'replacement.pdf', type: 'application/pdf', data: Buffer.from('%PDF- replacement') }
    const updated = {
      id: 'rfp-123', title: 'RFP', client: 'Client', industry: '', fileName: 'replacement.pdf',
      uploadedAt: '2026-07-22T00:00:00.000Z', status: 'uploaded' as const,
    }
    const deps = {
      readMultipartFormData: vi.fn().mockResolvedValue([file]),
      isSupabaseConfigured: vi.fn().mockReturnValue(true),
      validateRfpUpload: vi.fn(),
      getRfpById: vi.fn().mockResolvedValue({ id: 'rfp-123' }),
      extractRfpText: vi.fn().mockResolvedValue('Replacement text'),
      uploadFile: vi.fn().mockResolvedValue('rfp-123/replacement.pdf'),
      replaceRfpFile: vi.fn().mockResolvedValue(updated),
      analyze: vi.fn().mockResolvedValue({ analysis: {} }),
    }
    const event = { context: { params: { id: 'rfp-123' } } } as any

    await expect(handleReplaceRfpFile(event, deps as any)).resolves.toEqual(updated)
    expect(deps.validateRfpUpload).toHaveBeenCalledWith('replacement.pdf', 'application/pdf', file.data)
    expect(deps.uploadFile).toHaveBeenCalledWith('rfps', 'rfp-123/replacement.pdf', file.data, 'application/pdf')
    expect(deps.replaceRfpFile).toHaveBeenCalledWith('rfp-123', {
      fileName: 'replacement.pdf', filePath: 'rfp-123/replacement.pdf', content: 'Replacement text',
    })
    expect(deps.analyze).toHaveBeenCalledWith('rfp-123')
  })
})