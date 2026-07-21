import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'

export const EMBEDDING_DIMENSIONS = 1024
export const DOCUMENT_EMBEDDING_CHUNK_CHARACTERS = 12_000

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeInput(value: string): string {
  return value.split('\n').map(normalize).filter(Boolean).join('\n')
}

export function splitTextIntoChunks(text: string, maxChunkCharacters = DOCUMENT_EMBEDDING_CHUNK_CHARACTERS): string[] {
  const paragraphs = text.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  const push = () => {
    if (current) chunks.push(current)
    current = ''
  }

  for (const paragraph of paragraphs.length ? paragraphs : [text.trim()]) {
    if (paragraph.length > maxChunkCharacters) {
      push()
      for (let start = 0; start < paragraph.length; start += maxChunkCharacters) {
        chunks.push(paragraph.slice(start, start + maxChunkCharacters))
      }
      continue
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > maxChunkCharacters) {
      push()
      current = paragraph
    } else {
      current = candidate
    }
  }

  push()
  return chunks
}

function averageEmbeddings(embeddings: number[][]): number[] {
  if (!embeddings.length) return []
  const dimensions = embeddings[0]?.length ?? 0
  const totals = Array.from({ length: dimensions }, () => 0)
  for (const embedding of embeddings) {
    for (let index = 0; index < dimensions; index++) {
      const value = embedding[index] ?? 0
      totals[index]! += value
    }
  }
  return totals.map(total => total / embeddings.length)
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

export async function generateDocumentEmbedding(text: string, ai?: AIProvider): Promise<number[]> {
  const chunks = splitTextIntoChunks(text)
  if (!chunks.length) throw new Error('Document text is empty')
  const embeddings = await Promise.all(chunks.map(chunk => generateEmbedding(chunk, ai)))
  const pooled = averageEmbeddings(embeddings)
  if (pooled.length !== EMBEDDING_DIMENSIONS || pooled.some(value => !Number.isFinite(value))) {
    throw new Error('LM Studio returned an invalid pooled 1024-dimensional embedding')
  }
  return pooled
}
