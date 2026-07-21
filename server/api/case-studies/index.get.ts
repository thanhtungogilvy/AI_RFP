import { dbGetCaseStudies } from '../../services/supabase/db'
import { isSupabaseConfigured } from '../../services/supabase/client'

export default defineEventHandler(async () => {
  if (!isSupabaseConfigured()) throw createError({ statusCode: 503, statusMessage: 'Knowledge Base requires Supabase configuration' })
  return (await dbGetCaseStudies()) ?? []
})
