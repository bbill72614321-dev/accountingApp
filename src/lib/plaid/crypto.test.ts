import { afterEach, describe, expect, it } from 'vitest'
import { decryptAccessToken, encryptAccessToken } from './crypto'

const original = process.env.PLAID_TOKEN_ENCRYPTION_KEY

afterEach(() => {
  process.env.PLAID_TOKEN_ENCRYPTION_KEY = original
})

describe('Plaid access-token encryption', () => {
  it('round-trips an access token without retaining plaintext', () => {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

    const encrypted = encryptAccessToken('access-production-secret')

    expect(encrypted.ciphertext).not.toContain('access-production-secret')
    expect(decryptAccessToken(encrypted)).toBe('access-production-secret')
  })
})
