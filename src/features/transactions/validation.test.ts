import { describe, expect, it } from 'vitest'
import {
  loginSchema,
  manualTransactionSchema,
  passwordResetRequestSchema,
  updatePasswordSchema,
} from './validation'

describe('form validation', () => {
  it('normalizes a valid login', () => {
    expect(loginSchema.parse({ email: ' ONE@example.com ', password: 'long-enough' }).email).toBe('one@example.com')
  })

  it('rejects an invalid category and date', () => {
    expect(() => manualTransactionSchema.parse({
      merchant: 'Store', category: 'Unknown', date: '08/01/2026', amount: '-12.00', note: '',
    })).toThrow()
  })

  it('reports a malformed amount through safeParse', () => {
    const result = manualTransactionSchema.safeParse({
      merchant: 'Store', category: 'Grocery', date: '2026-08-01', amount: '12.345', note: '',
    })
    expect(result.success).toBe(false)
  })

  it('validates both password-reset boundaries', () => {
    expect(passwordResetRequestSchema.parse({ email: ' ONE@example.com ' })).toEqual({ email: 'one@example.com' })
    expect(() => updatePasswordSchema.parse({ password: 'short', confirmation: 'short' })).toThrow()
    expect(() => updatePasswordSchema.parse({ password: 'long-enough', confirmation: 'different-value' })).toThrow()
  })
})
