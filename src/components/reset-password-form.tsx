'use client'

import { useActionState } from 'react'
import { updatePassword, type ActionState } from '@/app/actions/auth'
import type { Dictionary } from '@/lib/i18n'

const initialState: ActionState = { status: 'idle', message: '' }

export function ResetPasswordForm({ dictionary }: { dictionary: Dictionary }) {
  const [state, action, pending] = useActionState(updatePassword, initialState)
  const message = state.message in dictionary ? dictionary[state.message as keyof Dictionary] : state.message

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="password">{dictionary.password}</label>
        <input className="mt-1 w-full rounded border p-2" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="confirmation">{dictionary.confirmPassword}</label>
        <input className="mt-1 w-full rounded border p-2" id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <p aria-live="polite" className="min-h-5 text-sm" role="status">{message}</p>
      <button className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50" disabled={pending} type="submit">
        {dictionary.resetPassword}
      </button>
    </form>
  )
}
