import { beforeAll, describe, expect, it, vi } from 'vitest'

let buildCapabilities: typeof import('#server/api/capabilities.get')['buildCapabilities']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  ;({ buildCapabilities } = await import('#server/api/capabilities.get'))
})

describe('buildCapabilities', () => {
  it('preserves boolean capabilities and exposes only actionable missing-variable reasons', () => {
    expect(buildCapabilities({}, false)).toEqual({
      supabase: false,
      chatModel: false,
      embeddingModel: false,
      pdfExport: false,
      reasons: {
        supabase: 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY.',
        chatModel: 'Set LMSTUDIO_CHAT_MODEL.',
        embeddingModel: 'Set LMSTUDIO_EMBEDDING_MODEL.',
        pdfExport: 'Install and configure LibreOffice, then set PDF_CONVERTER=libreoffice.',
      },
    })
  })
})
