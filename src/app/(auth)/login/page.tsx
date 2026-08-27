'use client'

import { useActionState } from 'react'
import { login, requestPasswordReset, type ActionState } from '@/app/actions/auth'

const initialState: ActionState = { status: 'idle', message: '' }

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(login, initialState)
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, initialState)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-10 p-6">
      <section>
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">Use the account your administrator created for you.</p>
      </section>

      <form action={loginAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input className="mt-1 w-full rounded border p-2" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">Password</label>
          <input className="mt-1 w-full rounded border p-2" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <p aria-live="polite" className="min-h-5 text-sm" role="status">{loginState.message}</p>
        <button className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50" disabled={loginPending} type="submit">
          {loginPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <form action={resetAction} className="border-t pt-6">
        <h2 className="font-medium">Forgot your password?</h2>
        <label className="mt-3 block text-sm font-medium" htmlFor="reset-email">Email</label>
        <input className="mt-1 w-full rounded border p-2" id="reset-email" name="email" type="email" autoComplete="email" required />
        <p aria-live="polite" className="min-h-5 pt-2 text-sm" role="status">{resetState.message}</p>
        <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={resetPending} type="submit">
          {resetPending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </main>
  )
}
