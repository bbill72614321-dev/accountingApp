'use client'

import { createBrowserClient as createClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env'

export function createBrowserClient() {
  const env = getPublicEnv()
  return createClient(env.supabaseUrl, env.supabaseAnonKey)
}
