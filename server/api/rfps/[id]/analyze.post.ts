import { LMStudioUnavailableError } from '../../../services/ai/lmStudio'
import { analyzeRfp } from '../../../services/rfp/analyzeRfp'
import { dbGetRfpAnalysisInput, dbSaveRfpAnalysis, dbUpdateRfpStatus } from '../../../services/supabase/db'
import { getEnvironmentCapabilities } from '../../../utils/environment'
import { dependencyUnavailable } from '../../../utils/errors'
import { ensureRequestId } from '../../../utils/request-id'

interface Dependencies {
  isChatModelConfigured: () => boolean
  getRfpInput: typeof dbGetRfpAnalysisInput
  analyze: typeof analyzeRfp
  saveAnalysis: typeof dbSaveRfpAnalysis
  updateStatus: typeof dbUpdateRfpStatus
}

const defaultDependencies: Dependencies = {
  isChatModelConfigured: () => getEnvironmentCapabilities().chatModel,
  getRfpInput: dbGetRfpAnalysisInput,
  analyze: analyzeRfp,
  saveAnalysis: dbSaveRfpAnalysis,
  updateStatus: dbUpdateRfpStatus,
}

export async function handleRfpAnalysis(event: Parameters<typeof getRouterParam>[0], deps: Dependencies = defaultDependencies) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })
  if (!deps.isChatModelConfigured()) {
    throw dependencyUnavailable('RFP analysis requires LMSTUDIO_CHAT_MODEL.', undefined).toH3(ensureRequestId(event))
  }
  const input = await deps.getRfpInput(rfpId)
  if (!input?.text) throw createError({ statusCode: 404, statusMessage: 'RFP text not found. Upload a text-bearing PDF or DOCX first.' })
  await deps.updateStatus(rfpId, 'analyzing')
  try {
    const analysis = await deps.analyze(input.text, rfpId)
    await deps.saveAnalysis(rfpId, analysis)
    await deps.updateStatus(rfpId, 'analyzed')
    return { analysis }
  } catch (error) {
    await deps.updateStatus(rfpId, 'error').catch(() => undefined)
    if (error instanceof LMStudioUnavailableError) throw createError({ statusCode: 503, statusMessage: error.message })
    if (error instanceof Error && error.message.startsWith('RFP text exceeds the ')) {
      throw createError({ statusCode: 422, statusMessage: error.message })
    }
    throw error
  }
}

export default defineEventHandler(event => handleRfpAnalysis(event))
