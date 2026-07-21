import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'
import { buildRfpAnalysisPrompt, RFP_ANALYSIS_RESPONSE_SCHEMA, SYSTEM_PROMPT_RFP_ANALYST } from '../ai/prompts'
import type { RfpAnalysis } from '~/types/rfp'

type AnalysisPayload = Omit<RfpAnalysis, 'rfpId' | 'analyzedAt'>

export const MAX_RFP_TEXT_CHARACTERS = 240_000
export const RFP_CHUNK_CHARACTERS = 12_000
const RFP_ANALYSIS_CONCURRENCY = 2

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isAnalysisPayload(value: unknown): value is AnalysisPayload {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return typeof data.clientName === 'string'
    && typeof data.industry === 'string'
    && typeof data.summary === 'string'
    && isStringList(data.businessProblems)
    && isStringList(data.requiredCapabilities)
    && isStringList(data.technicalRequirements)
    && isStringList(data.evaluationCriteria)
    && isStringList(data.searchKeywords)
}

function parseAnalysis(raw: string): AnalysisPayload {
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim())
    if (isAnalysisPayload(parsed)) return parsed
  } catch {
    // Normalize all malformed responses to a safe, actionable error.
  }
  throw new Error('LM Studio returned invalid RFP analysis JSON')
}

export function splitRfpText(rfpText: string, maxChunkCharacters = RFP_CHUNK_CHARACTERS): string[] {
  const paragraphs = rfpText.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''
  const push = () => {
    if (current) chunks.push(current)
    current = ''
  }
  for (const paragraph of paragraphs.length ? paragraphs : [rfpText.trim()]) {
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
    } else current = candidate
  }
  push()
  return chunks
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

function mergeAnalyses(analyses: AnalysisPayload[]): AnalysisPayload {
  const firstString = (key: 'clientName' | 'industry') => analyses.map(item => item[key]).find(Boolean) ?? ''
  return {
    clientName: firstString('clientName'),
    industry: firstString('industry'),
    businessProblems: unique(analyses.flatMap(item => item.businessProblems)),
    requiredCapabilities: unique(analyses.flatMap(item => item.requiredCapabilities)),
    technicalRequirements: unique(analyses.flatMap(item => item.technicalRequirements)),
    evaluationCriteria: unique(analyses.flatMap(item => item.evaluationCriteria)),
    summary: unique(analyses.map(item => item.summary)).join(' '),
    searchKeywords: unique(analyses.flatMap(item => item.searchKeywords)),
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index]!)
    }
  }))
  return results
}

/** Analyze RFP text with the server-side configured LM Studio provider. */
export async function analyzeRfp(rfpText: string, rfpId: string, ai?: AIProvider): Promise<RfpAnalysis> {
  if (!rfpText.trim()) throw new Error('RFP text is empty')
  if (rfpText.length > MAX_RFP_TEXT_CHARACTERS) throw new Error(`RFP text exceeds the ${MAX_RFP_TEXT_CHARACTERS.toLocaleString('en-US')} character limit`)
  const provider = ai ?? await getAIProvider()
  const chunks = splitRfpText(rfpText)
  const analyses = await mapWithConcurrency(chunks, RFP_ANALYSIS_CONCURRENCY, async chunk => parseAnalysis(await provider.complete(buildRfpAnalysisPrompt(chunk), {
    systemPrompt: SYSTEM_PROMPT_RFP_ANALYST,
    responseSchema: RFP_ANALYSIS_RESPONSE_SCHEMA,
    timeoutMs: 90_000,
  })))
  return { rfpId, ...mergeAnalyses(analyses), analyzedAt: new Date().toISOString() }
}
