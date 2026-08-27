import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')
  return data.user
}
