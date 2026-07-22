import { dbGetRfpById } from '../../../services/supabase/db'

interface Dependencies {
  getRfpById: typeof dbGetRfpById
}

const defaultDependencies: Dependencies = {
  getRfpById: dbGetRfpById,
}

export async function handleGetRfp(
  event: Parameters<typeof getRouterParam>[0],
  deps: Dependencies = defaultDependencies,
) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })

  const rfp = await deps.getRfpById(rfpId)
  if (!rfp) throw createError({ statusCode: 404, statusMessage: 'RFP document not found' })
  return rfp
}

export default defineEventHandler(event => handleGetRfp(event))