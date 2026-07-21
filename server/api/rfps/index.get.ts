import { dbGetRfps } from '../../services/supabase/db'
import { isSupabaseConfigured } from '../../services/supabase/client'

export default defineEventHandler(async () => {
  if (!isSupabaseConfigured()) throw createError({ statusCode: 503, statusMessage: 'RFP documents require Supabase configuration' })
  return (await dbGetRfps()) ?? []
})
