import { describe, expect, it } from 'vitest'
import { normalizeMerchant } from './merchant'

describe('normalizeMerchant', () => {
  it('normalizes casing, punctuation, and repeated whitespace', () => {
    expect(normalizeMerchant("  Trader Joe's #142  ")).toBe('TRADER JOES 142')
  })
})
