'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function setLanguage(formData: FormData) {
  const user = await requireUser()
  const language = z.enum(['zh-TW', 'en']).parse(formData.get('language'))
  const supabase = await createServerClient()
  const { error } = await supabase.from('profiles').update({ language }).eq('user_id', user.id)
  if (error) throw error
  ;(await cookies()).set('app-language', language, {
    sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
  })
  revalidatePath('/', 'layout')
}
