import { beforeAll, describe, expect, it, vi } from 'vitest'

let handleRfpDebug: typeof import('#server/api/rfps/[id]/debug.get')['handleRfpDebug']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: { id?: string } } }, key: string) => event.context.params[key as 'id'])
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  ;({ handleRfpDebug } = await import('#server/api/rfps/[id]/debug.get'))
})

describe('handleRfpDebug', () => {
  it('returns raw RFP debug payload with embedding preview', async () => {
    const debugRecord = {
      id: 'rfp-123',
      title: 'Modernisation',
      client: 'Example Bank',
      industry: 'Banking',
      deadline: null,
      file_name: 'rfp.pdf',
      file_path: 'rfps/rfp-123/rfp.pdf',
      content: 'Some extracted text',
      analysis: { summary: 'Analyzed summary', searchKeywords: ['banking'] },
      embedding: Array.from({ length: 20 }, (_, index) => index / 100),
      status: 'analyzed',
      uploaded_at: '2026-07-21T00:00:00.000Z',
      created_at: '2026-07-21T00:00:00.000Z',
    }
    const deps = { getRfpDebugById: vi.fn().mockResolvedValue(debugRecord) }

    const event = { context: { params: { id: 'rfp-123' } } } as any
    const result = await handleRfpDebug(event, deps as any)

    expect(deps.getRfpDebugById).toHaveBeenCalledWith('rfp-123')
    expect(result.embeddingCount).toBe(20)
    expect(result.embeddingPreview).toEqual(debugRecord.embedding.slice(0, 16))
    expect(result.contentLength).toBe(debugRecord.content.length)
    expect(result.wordCount).toBe(3)
    expect(result.lineCount).toBe(1)
    expect(result.extractionWarnings).toEqual([
      'Extracted content is short; check whether the uploaded file is a scanned PDF or a truncated document.',
      'Word count is low; verify that the extracted text includes the main body, not just headings.',
    ])
    expect(result.analysisKeys).toEqual(['summary', 'searchKeywords'])
  })
})
