import type { AIProvider, CompletionOptions } from './provider'
import { getServerEnvironment, type ServerEnvironment } from '../../utils/environment'

type Fetcher = typeof fetch

interface LMStudioProviderOptions {
  fetcher?: Fetcher
  environment?: Partial<ServerEnvironment>
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

  constructor({ fetcher = fetch, environment }: LMStudioProviderOptions = {}) {
    const configured = { ...getServerEnvironment(), ...environment }
    this.fetcher = fetcher
    this.baseUrl = configured.lmStudioBaseUrl.replace(/\/+$/, '')
    this.chatModel = configured.lmStudioChatModel ?? 'local-model'
    this.embeddingModel = configured.lmStudioEmbeddingModel ?? 'local-model'
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await this.request<ChatCompletionResponse>('/v1/chat/completions', {
      model: this.chatModel,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      stream: false,
      ...(options.responseSchema ? {
        response_format: { type: 'json_schema', json_schema: options.responseSchema },
      } : {}),
    }, options.timeoutMs)
    const content = response.choices?.[0]?.message?.content
    if (!content) throw new Error('LM Studio returned an empty chat completion')
    return content
  }

  async embed(input: string): Promise<number[]> {
    const response = await this.request<EmbeddingsResponse>('/v1/embeddings', {
      model: this.embeddingModel,
      input,
    }, 30_000)
    const embedding = response.data?.[0]?.embedding
    if (!embedding?.length) throw new Error('LM Studio returned an empty embedding')
    return embedding
  }

  private async request<T>(path: string, body: Record<string, unknown>, timeoutMs = 90_000): Promise<T> {
    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      if (error instanceof TypeError || (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))) {
        throw new LMStudioUnavailableError(`LM Studio is unavailable or did not respond within ${Math.ceil(timeoutMs / 1000)} seconds.`)
      }
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
