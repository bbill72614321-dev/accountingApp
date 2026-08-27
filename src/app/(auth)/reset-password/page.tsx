'use client'

import { useActionState } from 'react'
import { updatePassword, type ActionState } from '@/app/actions/auth'

const initialState: ActionState = { status: 'idle', message: '' }

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Set a new password</h1>
      <form action={action} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="password">New password</label>
          <input className="mt-1 w-full rounded border p-2" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="confirmation">Confirm new password</label>
          <input className="mt-1 w-full rounded border p-2" id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <p aria-live="polite" className="min-h-5 text-sm" role="status">{state.message}</p>
        <button className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50" disabled={pending} type="submit">
          {pending ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </main>
  )
}
