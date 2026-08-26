import { afterEach, describe, expect, it } from 'vitest'
import { getPublicEnv } from './env'

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
})
