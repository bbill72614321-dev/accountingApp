import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { getPlaidEnv, getPublicEnv, getServerEnv, getSupabaseAdminEnv } from './env'

const original = { ...process.env }

afterEach(() => {
  process.env = { ...original }
})

describe('getPublicEnv', () => {
  it('rejects a missing Supabase URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(() => getPublicEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('returns validated public configuration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(getPublicEnv()).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'anon-key',
    })
  })

  it('uses the local recovery origin from the environment template', () => {
    const template = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')
    for (const line of template.split('\n')) {
      const separator = line.indexOf('=')
      if (separator > 0) process.env[line.slice(0, separator)] = line.slice(separator + 1)
    }

    expect(getServerEnv().appUrl).toBe('http://127.0.0.1:3000')
  })
})

describe('getPlaidEnv', () => {
  it('accepts server-only Plaid configuration', () => {
    process.env.PLAID_CLIENT_ID = 'client-id'
    process.env.PLAID_SECRET = 'secret'
    process.env.PLAID_ENV = 'production'
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 4).toString('base64')

    expect(getPlaidEnv()).toEqual({
      clientId: 'client-id',
      secret: 'secret',
      environment: 'production',
      tokenEncryptionKey: Buffer.alloc(32, 4).toString('base64'),
    })
  })
})

describe('getSupabaseAdminEnv', () => {
  it('requires the server-only Supabase service role key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

    expect(getSupabaseAdminEnv()).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      serviceRoleKey: 'service-role-key',
    })
  })
})
