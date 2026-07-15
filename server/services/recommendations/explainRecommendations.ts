import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'
import { buildRecommendationExplanationPrompt, SYSTEM_PROMPT_RECOMMENDATION_EXPLAINER } from '../ai/prompts'
import type { CaseStudyRecommendation } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'

export interface RecommendationExplanation { caseStudyId: string; reason: string; matchedRequirements: string[]; confidence: number }
export class RecommendationExplanationUnavailableError extends Error { constructor() { super('AI explanation unavailable'); this.name = 'RecommendationExplanationUnavailableError' } }

export async function explainRecommendations(analysis: RfpAnalysis, recommendations: CaseStudyRecommendation[], ai?: AIProvider): Promise<RecommendationExplanation[]> {
  try {
    const requirements = [...new Set([...analysis.requiredCapabilities, ...analysis.technicalRequirements, ...analysis.evaluationCriteria])]
    const payload = recommendations.map(item => ({ caseStudyId: item.caseStudyId, matchedSlideExcerpts: item.matchedSlideExcerpts }))
    const raw = await (ai ?? await getAIProvider()).complete(buildRecommendationExplanationPrompt(requirements, JSON.stringify(payload)), SYSTEM_PROMPT_RECOMMENDATION_EXPLAINER)
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) as { explanations?: RecommendationExplanation[] }
    if (!Array.isArray(parsed.explanations) || parsed.explanations.length !== recommendations.length) throw new Error('invalid explanation count')
    const expected = new Set(recommendations.map(item => item.caseStudyId))
    const seen = new Set<string>()
    for (const item of parsed.explanations) {
      if (!item || !expected.has(item.caseStudyId) || seen.has(item.caseStudyId) || typeof item.reason !== 'string' || !item.reason.trim() || !Array.isArray(item.matchedRequirements) || item.matchedRequirements.some(value => !requirements.includes(value)) || !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) throw new Error('invalid explanation')
      seen.add(item.caseStudyId)
    }
    return parsed.explanations
  } catch { throw new RecommendationExplanationUnavailableError() }
}
