import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('auth callback redirects', () => {
  it('rejects backslash-based external destinations', async () => {
    const response = await GET(new NextRequest('https://ledger.example/auth/callback?next=%2F%5Cevil.example'))

    expect(response.headers.get('location')).toBe('https://ledger.example/reset-password')
  })

  it('retains allowed internal destinations', async () => {
    const response = await GET(new NextRequest('https://ledger.example/auth/callback?next=/dashboard'))

    expect(response.headers.get('location')).toBe('https://ledger.example/dashboard')
  })
})
