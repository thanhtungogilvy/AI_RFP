import { findRelevantCaseStudies } from '../../../services/recommendations/findRelevantCaseStudies'
import { dbGetCaseStudies, dbGetRfpAnalysis } from '../../../services/supabase/db'
import { RecommendationExplanationUnavailableError } from '../../../services/recommendations/explainRecommendations'

interface Dependencies {
  getAnalysis: typeof dbGetRfpAnalysis
  getCaseStudies: typeof dbGetCaseStudies
  findRelevant: typeof findRelevantCaseStudies
}

const defaultDependencies: Dependencies = {
  getAnalysis: dbGetRfpAnalysis,
  getCaseStudies: dbGetCaseStudies,
  findRelevant: findRelevantCaseStudies,
}

export async function handleRecommendations(
  event: Parameters<typeof getRouterParam>[0], deps: Dependencies = defaultDependencies,
) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })
  const analysis = await deps.getAnalysis(rfpId)
  if (!analysis) throw createError({ statusCode: 404, statusMessage: 'RFP analysis not found' })
  const caseStudies = (await deps.getCaseStudies()) ?? []
  try {
    const recommendations = await deps.findRelevant(analysis, caseStudies.filter(item => item.status === 'indexed'))
    return { analysis, recommendations }
  } catch (error) {
    if (error instanceof RecommendationExplanationUnavailableError) throw createError({ statusCode: 503, statusMessage: 'AI explanation unavailable' })
    throw error
  }
}

export default defineEventHandler(event => handleRecommendations(event))
