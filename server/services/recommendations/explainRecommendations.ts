import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'
import { buildRecommendationExplanationPrompt, RECOMMENDATION_EXPLANATION_RESPONSE_SCHEMA, SYSTEM_PROMPT_RECOMMENDATION_EXPLAINER } from '../ai/prompts'
import type { RequirementRecommendation } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'

export interface RecommendationExplanation { recommendationId: string; reason: string; matchedRequirements: string[]; confidence: number }
export class RecommendationExplanationUnavailableError extends Error { constructor() { super('AI explanation unavailable'); this.name = 'RecommendationExplanationUnavailableError' } }

export async function explainRecommendations(analysis: RfpAnalysis, recommendations: RequirementRecommendation[], ai?: AIProvider): Promise<RecommendationExplanation[]> {
  try {
    const requirements = [...new Set([...analysis.requiredCapabilities, ...analysis.technicalRequirements, ...analysis.evaluationCriteria])]
    const payload = recommendations.map(item => ({
      recommendationId: item.id,
      requirement: item.requirement,
      requirementType: item.requirementType,
      matchedCaseStudies: item.matchedCaseStudies,
      matchedSlideExcerpts: item.matchedSlideExcerpts,
    }))
    const provider = ai ?? await getAIProvider()
    let raw = ''
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        raw = await provider.complete(buildRecommendationExplanationPrompt(requirements, JSON.stringify(payload)), {
          systemPrompt: SYSTEM_PROMPT_RECOMMENDATION_EXPLAINER,
          responseSchema: RECOMMENDATION_EXPLANATION_RESPONSE_SCHEMA,
          timeoutMs: 60_000,
        })
        lastError = undefined
        break
      } catch (error) {
        lastError = error
      }
    }
    if (lastError) throw lastError
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) as { explanations?: RecommendationExplanation[] }
    if (!Array.isArray(parsed.explanations) || parsed.explanations.length !== recommendations.length) throw new Error('invalid explanation count')
    const expected = new Set(recommendations.map(item => item.id))
    const seen = new Set<string>()
    for (const item of parsed.explanations) {
      if (!item || !expected.has(item.recommendationId) || seen.has(item.recommendationId) || typeof item.reason !== 'string' || !item.reason.trim() || !Array.isArray(item.matchedRequirements) || item.matchedRequirements.some(value => !requirements.includes(value)) || !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) throw new Error('invalid explanation')
      seen.add(item.recommendationId)
    }
    return parsed.explanations
  } catch { throw new RecommendationExplanationUnavailableError() }
}
