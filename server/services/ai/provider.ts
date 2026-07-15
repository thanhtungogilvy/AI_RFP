export interface AIProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>
  embed(input: string): Promise<number[]>
}

/**
 * Returns the configured AI provider.
 * Currently uses LM Studio. Swap this function to switch providers.
 */
export async function getAIProvider(): Promise<AIProvider> {
  const { LMStudioProvider } = await import('./lmStudio')
  return new LMStudioProvider()
}
