'use client'

import { useActionState } from 'react'
import { login, requestPasswordReset, type ActionState } from '@/app/actions/auth'
import type { Dictionary } from '@/lib/i18n'

const initialState: ActionState = { status: 'idle', message: '' }

function messageFor(message: string, dictionary: Dictionary) {
  return message in dictionary ? dictionary[message as keyof Dictionary] : message
}

export function LoginForm({ dictionary }: { dictionary: Dictionary }) {
  const [loginState, loginAction, loginPending] = useActionState(login, initialState)
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, initialState)

  return (
    <>
      <form action={loginAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="email">{dictionary.email}</label>
          <input className="mt-1 w-full rounded border p-2" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">{dictionary.password}</label>
          <input className="mt-1 w-full rounded border p-2" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <p aria-live="polite" className="min-h-5 text-sm" role="status">{messageFor(loginState.message, dictionary)}</p>
        <button className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50" disabled={loginPending} type="submit">
          {dictionary.login}
        </button>
      </form>

      <form action={resetAction} className="border-t pt-6">
        <h2 className="font-medium">{dictionary.forgotPassword}</h2>
        <label className="mt-3 block text-sm font-medium" htmlFor="reset-email">{dictionary.email}</label>
        <input className="mt-1 w-full rounded border p-2" id="reset-email" name="email" type="email" autoComplete="email" required />
        <p aria-live="polite" className="min-h-5 pt-2 text-sm" role="status">{messageFor(resetState.message, dictionary)}</p>
        <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={resetPending} type="submit">
          {dictionary.sendResetLink}
        </button>
      </form>
    </>
  )
}
