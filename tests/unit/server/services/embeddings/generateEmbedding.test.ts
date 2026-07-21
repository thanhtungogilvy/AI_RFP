import { describe, expect, it, vi } from 'vitest'
import {
  buildRecommendationQuery,
  EMBEDDING_DIMENSIONS,
  generateEmbedding,
  generateSlideEmbedding,
} from '#server/services/embeddings/generateEmbedding'

const vector = () => Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => index / EMBEDDING_DIMENSIONS)

function provider(embedding = vector()) {
  return {
    complete: vi.fn(),
    embed: vi.fn().mockResolvedValue(embedding),
  }
}

describe('embedding service', () => {
  it('normalizes slide title and content before embedding', async () => {
    const ai = provider()

    await generateSlideEmbedding({ title: ' Results ', content: '  42%   faster\n delivery ' }, ai)

    expect(ai.embed).toHaveBeenCalledWith('Results\n42% faster delivery')
  })

  it('builds an RFP query from summary and unique keywords', () => {
    expect(buildRecommendationQuery({
      summary: ' Cloud migration ',
      searchKeywords: ['banking', 'cloud migration', 'banking'],
    })).toBe('Cloud migration\nbanking\ncloud migration')
  })

  it.each([[1, 2], Array(EMBEDDING_DIMENSIONS).fill(Number.NaN)])('rejects invalid embeddings', async (embedding) => {
    await expect(generateEmbedding('input', provider(embedding))).rejects.toThrow(
      'LM Studio returned an invalid 1024-dimensional embedding',
    )
  })
})
