import { dbGetCaseStudies, dbSearchCaseStudies } from '../../services/supabase/db'
import { isSupabaseConfigured } from '../../services/supabase/client'

export default defineEventHandler(async (event) => {
  if (!isSupabaseConfigured()) throw createError({ statusCode: 503, statusMessage: 'Knowledge Base requires Supabase configuration' })
  const query = ((getQuery(event).q as string) ?? '').trim()
  return query ? (await dbSearchCaseStudies(query)) ?? [] : (await dbGetCaseStudies()) ?? []
})
