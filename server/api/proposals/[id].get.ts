import { dbGetProposalById } from '../../services/supabase/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing proposal id' })

  const fromDb = await dbGetProposalById(id)
  if (fromDb) return fromDb
  throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
})
