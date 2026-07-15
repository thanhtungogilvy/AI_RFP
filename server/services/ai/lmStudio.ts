import type { AIProvider } from './provider'

type Fetcher = typeof fetch

interface LMStudioProviderOptions {
  fetcher?: Fetcher
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>
}

interface EmbeddingsResponse {
  data?: Array<{ embedding?: number[] }>
}

export class LMStudioUnavailableError extends Error {
  constructor(message = 'LM Studio is unavailable. Start the local server and load the configured model.') {
    super(message)
    this.name = 'LMStudioUnavailableError'
  }
}

export class LMStudioProvider implements AIProvider {
  private readonly fetcher: Fetcher
  private readonly baseUrl: string
  private readonly chatModel: string
  private readonly embeddingModel: string

  constructor({ fetcher = fetch }: LMStudioProviderOptions = {}) {
    this.fetcher = fetcher
    this.baseUrl = (process.env.LMSTUDIO_BASE_URL ?? process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234').replace(/\/+$/, '')
    this.chatModel = process.env.LMSTUDIO_CHAT_MODEL ?? process.env.LM_STUDIO_MODEL ?? 'local-model'
    this.embeddingModel = process.env.LMSTUDIO_EMBEDDING_MODEL ?? process.env.LM_STUDIO_EMBEDDING_MODEL ?? 'local-model'
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.request<ChatCompletionResponse>('/v1/chat/completions', {
      model: this.chatModel,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      stream: false,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'rfp_analysis',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              clientName: { type: 'string' },
              industry: { type: 'string' },
              businessProblems: { type: 'array', items: { type: 'string' } },
              requiredCapabilities: { type: 'array', items: { type: 'string' } },
              technicalRequirements: { type: 'array', items: { type: 'string' } },
              evaluationCriteria: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' },
              searchKeywords: { type: 'array', items: { type: 'string' } },
            },
            required: ['clientName', 'industry', 'businessProblems', 'requiredCapabilities', 'technicalRequirements', 'evaluationCriteria', 'summary', 'searchKeywords'],
          },
        },
      },
    })
    const content = response.choices?.[0]?.message?.content
    if (!content) throw new Error('LM Studio returned an empty chat completion')
    return content
  }

  async embed(input: string): Promise<number[]> {
    const response = await this.request<EmbeddingsResponse>('/v1/embeddings', {
      model: this.embeddingModel,
      input,
    })
    const embedding = response.data?.[0]?.embedding
    if (!embedding?.length) throw new Error('LM Studio returned an empty embedding')
    return embedding
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (error) {
      if (error instanceof TypeError) throw new LMStudioUnavailableError()
      throw error
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status >= 500 || response.status === 404) {
        throw new LMStudioUnavailableError(`LM Studio is unavailable or has no compatible model loaded (${response.status}).`)
      }
      throw new Error(`LM Studio request failed (${response.status})${detail ? `: ${detail}` : ''}`)
    }
    return response.json() as Promise<T>
  }
}
