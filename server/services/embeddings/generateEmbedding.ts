import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'

export const EMBEDDING_DIMENSIONS = 1024

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeInput(value: string): string {
  return value.split('\n').map(normalize).filter(Boolean).join('\n')
}

export async function generateEmbedding(input: string, ai?: AIProvider): Promise<number[]> {
  const provider = ai ?? await getAIProvider()
  const embedding = await provider.embed(normalizeInput(input))
  if (embedding.length !== EMBEDDING_DIMENSIONS || embedding.some(value => !Number.isFinite(value))) {
    throw new Error('LM Studio returned an invalid 1024-dimensional embedding')
  }
  return embedding
}

export function generateSlideEmbedding(
  slide: { title: string; content: string },
  ai?: AIProvider,
): Promise<number[]> {
  return generateEmbedding([normalize(slide.title), normalize(slide.content)].filter(Boolean).join('\n'), ai)
}

export function buildRecommendationQuery(analysis: { summary: string; searchKeywords: string[] }): string {
  const keywords = [...new Set(analysis.searchKeywords.map(normalize).filter(Boolean))]
  return [normalize(analysis.summary), ...keywords].filter(Boolean).join('\n')
}
