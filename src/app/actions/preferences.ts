'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function setLanguage(value: string) {
  const user = await requireUser()
  const language = z.enum(['zh-TW', 'en']).parse(value)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('profiles').update({ language }).eq('user_id', user.id)
    .select('language').single()
  if (error) throw error
  if (data.language !== language) throw new Error('Language preference was not updated')
  ;(await cookies()).set('app-language', language, {
    sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
  })
  revalidatePath('/', 'layout')
  return language
}
