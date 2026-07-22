import { dbGetRfpById, dbUpdateRfpMetadata, type RfpMetadata } from '../../../services/supabase/db'

interface Dependencies {
  readBody: typeof readBody
  getRfpById: typeof dbGetRfpById
  updateRfpMetadata: typeof dbUpdateRfpMetadata
}

const defaultDependencies: Dependencies = {
  readBody,
  getRfpById: dbGetRfpById,
  updateRfpMetadata: dbUpdateRfpMetadata,
}

function parseMetadata(body: unknown): RfpMetadata {
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'RFP metadata is required' })
  }
  if ('status' in body) {
    throw createError({ statusCode: 400, statusMessage: 'RFP status is managed by analysis' })
  }

  const { title, client, industry, deadline } = body as Record<string, unknown>
  if (typeof title !== 'string' || !title.trim() || typeof client !== 'string' || !client.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'RFP title and client are required' })
  }
  if (industry !== undefined && typeof industry !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'RFP industry must be a string' })
  }
  if (deadline !== undefined && deadline !== null && typeof deadline !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'RFP deadline must be an ISO date string' })
  }

  return {
    title: title.trim(),
    client: client.trim(),
    industry: typeof industry === 'string' ? industry.trim() : '',
    deadline: typeof deadline === 'string' && deadline ? deadline : undefined,
  }
}

export async function handlePatchRfp(
  event: Parameters<typeof getRouterParam>[0],
  deps: Dependencies = defaultDependencies,
) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })

  const fields = parseMetadata(await deps.readBody(event))
  const rfp = await deps.getRfpById(rfpId)
  if (!rfp) throw createError({ statusCode: 404, statusMessage: 'RFP document not found' })

  const updated = await deps.updateRfpMetadata(rfp.id, fields)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'RFP document not found' })
  return updated
}

export default defineEventHandler(event => handlePatchRfp(event))