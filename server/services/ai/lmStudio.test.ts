import { afterEach, describe, expect, it, vi } from 'vitest'
import { LMStudioProvider, LMStudioUnavailableError } from './lmStudio'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('LMStudioProvider', () => {
  it('sends a server-side OpenAI-compatible chat completion request', async () => {
    vi.stubEnv('LMSTUDIO_BASE_URL', 'http://localhost:1234/')
    vi.stubEnv('LMSTUDIO_CHAT_MODEL', 'qwen-test')
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'structured answer' } }],
    }), { status: 200 }))
    const provider = new LMStudioProvider({ fetcher })

    await expect(provider.complete('Analyze this', { systemPrompt: 'Be precise' })).resolves.toBe('structured answer')
    expect(fetcher).toHaveBeenCalledWith('http://localhost:1234/v1/chat/completions', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)
    expect(body).toMatchObject({
      model: 'qwen-test',
      messages: [
        { role: 'system', content: 'Be precise' },
        { role: 'user', content: 'Analyze this' },
      ],
      stream: false,
    })
  })

  it('uses the response schema supplied by the caller instead of the RFP schema', async () => {
    vi.stubEnv('LMSTUDIO_BASE_URL', 'http://localhost:1234')
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"explanations":[]}' } }],
    }), { status: 200 }))
    const provider = new LMStudioProvider({ fetcher })
    const explanationSchema = {
      name: 'recommendation_explanations',
      strict: true,
      schema: { type: 'object', properties: { explanations: { type: 'array' } }, required: ['explanations'] },
    }

    await provider.complete('Explain candidates', {
      systemPrompt: 'Explain only supplied evidence.',
      responseSchema: explanationSchema,
      timeoutMs: 60_000,
    } as any)

    const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Explain only supplied evidence.' })
    expect(body.response_format.json_schema).toEqual(explanationSchema)
  })

  it('uses the configured embedding model for embeddings', async () => {
    vi.stubEnv('LMSTUDIO_BASE_URL', 'http://localhost:1234')
    vi.stubEnv('LMSTUDIO_EMBEDDING_MODEL', 'nomic-embed-text')
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ embedding: [0.1, 0.2] }],
    }), { status: 200 }))

    await expect(new LMStudioProvider({ fetcher }).embed('RFP requirement')).resolves.toEqual([0.1, 0.2])
    expect(fetcher).toHaveBeenCalledWith('http://localhost:1234/v1/embeddings', expect.objectContaining({
      body: JSON.stringify({ model: 'nomic-embed-text', input: 'RFP requirement' }),
    }))
  })

  it('returns a user-safe error when LM Studio is unavailable', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    await expect(new LMStudioProvider({ fetcher }).complete('Analyze')).rejects.toMatchObject({
      name: LMStudioUnavailableError.name,
      message: expect.stringContaining('LM Studio is unavailable'),
    })
  })
})
