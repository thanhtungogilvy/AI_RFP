import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'
import { buildRfpAnalysisPrompt, SYSTEM_PROMPT_RFP_ANALYST } from '../ai/prompts'
import type { RfpAnalysis } from '~/types/rfp'

type AnalysisPayload = Omit<RfpAnalysis, 'rfpId' | 'analyzedAt'>

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

/** Analyze RFP text with the server-side configured LM Studio provider. */
export async function analyzeRfp(rfpText: string, rfpId: string, ai?: AIProvider): Promise<RfpAnalysis> {
  if (!rfpText.trim()) throw new Error('RFP text is empty')
  const provider = ai ?? await getAIProvider()
  const payload = parseAnalysis(await provider.complete(buildRfpAnalysisPrompt(rfpText), SYSTEM_PROMPT_RFP_ANALYST))
  return { rfpId, ...payload, analyzedAt: new Date().toISOString() }
}
