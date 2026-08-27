import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const resetPasswordForEmail = vi.hoisted(() => vi.fn(async () => ({ error: null })))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({ auth: { resetPasswordForEmail } })),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requestPasswordReset } from './auth'

const original = { ...process.env }

afterEach(() => {
  process.env = { ...original }
  vi.clearAllMocks()
})

describe('requestPasswordReset', () => {
  it('uses the exact allowlisted local recovery callback', async () => {
    const template = readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8')
    for (const line of template.split('\n')) {
      const separator = line.indexOf('=')
      if (separator > 0) process.env[line.slice(0, separator)] = line.slice(separator + 1)
    }
    const formData = new FormData()
    formData.set('email', ' User@example.com ')

    await requestPasswordReset({ status: 'idle', message: '' }, formData)

    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'http://127.0.0.1:3000/auth/callback?next=/reset-password',
    })
  })
})
