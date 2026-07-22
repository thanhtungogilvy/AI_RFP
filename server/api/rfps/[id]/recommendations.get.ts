import { createEventStream } from 'h3'
import { findRelevantCaseStudies } from '../../../services/recommendations/findRelevantCaseStudies'
import { dbGetCaseStudies, dbGetRfpAnalysis, dbGetRfpRecommendations, dbSaveRfpRecommendations, dbGetLatestIndexedCaseStudyAt } from '../../../services/supabase/db'
import { RecommendationExplanationUnavailableError } from '../../../services/recommendations/explainRecommendations'
import type { RequirementRecommendation } from '~/types/recommendation'

interface Dependencies {
  getAnalysis: typeof dbGetRfpAnalysis
  getCaseStudies: typeof dbGetCaseStudies
  findRelevant: typeof findRelevantCaseStudies
  getCached: typeof dbGetRfpRecommendations
  saveCache: typeof dbSaveRfpRecommendations
  getLatestCaseStudyAt: typeof dbGetLatestIndexedCaseStudyAt
}

const defaultDependencies: Dependencies = {
  getAnalysis: dbGetRfpAnalysis,
  getCaseStudies: dbGetCaseStudies,
  findRelevant: findRelevantCaseStudies,
  getCached: dbGetRfpRecommendations,
  saveCache: dbSaveRfpRecommendations,
  getLatestCaseStudyAt: dbGetLatestIndexedCaseStudyAt,
}

export default defineEventHandler(async (event) => {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })

  const refresh = getQuery(event).refresh === 'true'
  const deps = defaultDependencies

  const eventStream = createEventStream(event)
  const push = (payload: unknown) => eventStream.push(JSON.stringify(payload))

  ;(async () => {
    try {
      // Cache-first: return immediately when fresh cache exists and not a forced refresh
      if (!refresh) {
        const [cached, latestCaseStudyAt] = await Promise.all([
          deps.getCached(rfpId),
          deps.getLatestCaseStudyAt(),
        ])
        if (cached) {
          const isStale = latestCaseStudyAt !== null && latestCaseStudyAt > cached.generatedAt
          if (!isStale) {
            const analysis = await deps.getAnalysis(rfpId)
            await push({ type: 'done', data: { analysis, recommendations: cached.recommendations } })
            await eventStream.close()
            return
          }
        }
      }

      // Cache miss / stale / forced refresh — run pipeline with progress events
      const analysis = await deps.getAnalysis(rfpId)
      if (!analysis) {
        await push({ type: 'error', message: 'RFP analysis not found' })
        await eventStream.close()
        return
      }

      const caseStudies = (await deps.getCaseStudies()) ?? []

      let recommendations: RequirementRecommendation[]
      try {
        recommendations = await deps.findRelevant(
          analysis,
          caseStudies.filter(item => item.status === 'indexed'),
          undefined,
          (step, message) => push({ type: 'progress', step, message }),
        )
      } catch (error) {
        const message = error instanceof RecommendationExplanationUnavailableError
          ? 'AI explanation unavailable'
          : 'Failed to generate recommendations'
        await push({ type: 'error', message })
        await eventStream.close()
        return
      }

      // Save to cache in background — don't block the response
      deps.saveCache(rfpId, recommendations).catch(() => undefined)

      await push({ type: 'done', data: { analysis, recommendations } })
    } catch {
      await push({ type: 'error', message: 'An unexpected error occurred' })
    } finally {
      await eventStream.close()
    }
  })()

  return eventStream.send()
})
