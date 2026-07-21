import { dbGetRfpDebugById } from '../../../services/supabase/db'

interface Dependencies {
  getRfpDebugById: typeof dbGetRfpDebugById
}

const defaultDependencies: Dependencies = {
  getRfpDebugById: dbGetRfpDebugById,
}

export async function handleRfpDebug(event: Parameters<typeof getRouterParam>[0], deps: Dependencies = defaultDependencies) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })

  const debug = await deps.getRfpDebugById(rfpId)
  if (!debug) throw createError({ statusCode: 404, statusMessage: 'RFP not found' })

  const content = debug.content ?? ''
  const contentLength = content.length
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const lineCount = content ? content.split(/\r?\n/).length : 0
  const extractionWarnings: string[] = []

  if (contentLength === 0) {
    extractionWarnings.push('No extracted content was saved for this RFP.')
  } else {
    if (contentLength < 1000) extractionWarnings.push('Extracted content is short; check whether the uploaded file is a scanned PDF or a truncated document.')
    if (wordCount < 200) extractionWarnings.push('Word count is low; verify that the extracted text includes the main body, not just headings.')
  }

  return {
    ...debug,
    embeddingCount: debug.embedding?.length ?? 0,
    embeddingPreview: debug.embedding?.slice(0, 16) ?? [],
    contentLength,
    wordCount,
    lineCount,
    extractionWarnings,
    analysisKeys: debug.analysis && typeof debug.analysis === 'object' ? Object.keys(debug.analysis as Record<string, unknown>) : [],
  }
}

export default defineEventHandler(event => handleRfpDebug(event))