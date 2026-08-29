import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminEnv } from '@/lib/env'

export function createAdminClient() {
  const env = getSupabaseAdminEnv()
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
