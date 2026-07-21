import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { getEnvironmentCapabilities, getServerEnvironment } from '../../utils/environment'

let _client: SupabaseClient<Database> | null = null

/**
 * Returns the Supabase service-role client.
 * Returns null (with no error) when SUPABASE_URL / SUPABASE_SERVICE_KEY are
 * not set. Routes translate that condition into an actionable 503 response.
 *
 * SECURITY: This client uses the service role key and must NEVER be called
 * from client-side code. Only import it inside server/ routes and services.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const { supabaseUrl: url, supabaseServiceKey: key } = getServerEnvironment()

  if (!url || !key) return null

  if (!_client) {
    _client = createClient<Database>(url, key, {
      auth: {
        // Service role — no session needed
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return _client
}

export const isSupabaseConfigured = (): boolean =>
  getEnvironmentCapabilities().supabase
