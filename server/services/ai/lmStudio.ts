import type { AIProvider } from './provider'

// TODO: Configure LM Studio base URL via environment variable LM_STUDIO_BASE_URL
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234'
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL ?? 'local-model'

export class LMStudioProvider implements AIProvider {
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    // TODO: Implement OpenAI-compatible chat completion call to LM Studio
    // LM Studio exposes an OpenAI-compatible REST API at /v1/chat/completions
    const response = await $fetch<{ choices: { message: { content: string } }[] }>(
      `${LM_STUDIO_BASE_URL}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: LM_STUDIO_MODEL,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        },
      }
    )
    return response.choices[0]?.message?.content ?? ''
  }
}
