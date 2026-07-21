import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEnvironmentCapabilities, getServerEnvironment } from '#server/utils/environment'

afterEach(() => vi.unstubAllEnvs())

describe('getEnvironmentCapabilities', () => {
  it('reports actionable reasons for missing production dependencies without exposing values', () => {
    const capabilities = getEnvironmentCapabilities({})

    expect(capabilities).toEqual({
      supabase: false,
      chatModel: false,
      embeddingModel: false,
      reasons: {
        supabase: 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY.',
        chatModel: 'Set LMSTUDIO_CHAT_MODEL.',
        embeddingModel: 'Set LMSTUDIO_EMBEDDING_MODEL.',
      },
    })
  })

  it('recognizes the documented environment variables when they are non-empty', () => {
    const capabilities = getEnvironmentCapabilities({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_KEY: 'secret',
      LMSTUDIO_CHAT_MODEL: 'chat-model',
      LMSTUDIO_EMBEDDING_MODEL: 'embedding-model',
    })

    expect(capabilities).toEqual({ supabase: true, chatModel: true, embeddingModel: true, reasons: {} })
  })

  it('reads only the documented names and provides the local LM Studio URL default', () => {
    expect(getServerEnvironment({ LM_STUDIO_MODEL: 'legacy', LMSTUDIO_CHAT_MODEL: 'chat' })).toMatchObject({
      lmStudioBaseUrl: 'http://localhost:1234',
      lmStudioChatModel: 'chat',
      lmStudioEmbeddingModel: undefined,
    })
  })
})
