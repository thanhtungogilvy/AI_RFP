import type { RfpAnalysis } from '~/types/rfp'

/**
 * Analyze an RFP document text and extract structured requirements.
 * TODO: Wire up AI provider and persist result to Supabase
 */
export async function analyzeRfp(_rfpText: string, _rfpId: string): Promise<RfpAnalysis> {
  // TODO: const ai = await getAIProvider()
  // TODO: const prompt = buildRfpAnalysisPrompt(rfpText)
  // TODO: const raw = await ai.complete(prompt, SYSTEM_PROMPT_RFP_ANALYST)
  // TODO: const parsed = JSON.parse(raw)
  // TODO: Persist parsed analysis to Supabase DB
  // TODO: Return RfpAnalysis object
  throw new Error('RFP analysis not yet implemented')
}
