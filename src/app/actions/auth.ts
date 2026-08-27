'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import {
  loginSchema, passwordResetRequestSchema, updatePasswordSchema,
} from '@/features/transactions/validation'

export type ActionState = { status: 'idle' | 'success' | 'error'; message: string }
const INVALID_LOGIN = { status: 'error', message: 'invalidLogin' } as const
const RESET_RESPONSE = { status: 'success', message: 'resetSent' } as const

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'), password: formData.get('password'),
  })
  if (!parsed.success) return INVALID_LOGIN
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return INVALID_LOGIN
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function requestPasswordReset(
  _state: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return RESET_RESPONSE
  const supabase = await createServerClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getServerEnv().appUrl}/auth/callback?next=/reset-password`,
  })
  return RESET_RESPONSE
}

export async function updatePassword(
  _state: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'), confirmation: formData.get('confirmation'),
  })
  if (!parsed.success) return { status: 'error', message: 'updateFailed' }
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { status: 'error', message: 'recoveryExpired' }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { status: 'error', message: 'updateFailed' }
  return { status: 'success', message: 'passwordUpdated' }
}
