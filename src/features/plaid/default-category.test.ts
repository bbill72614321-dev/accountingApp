import { describe, expect, it } from 'vitest'
import { defaultCategoryForMerchant } from './default-category'

describe('defaultCategoryForMerchant', () => {
  it('matches a merchant rule after normalizing case and whitespace', () => {
    expect(defaultCategoryForMerchant('  SAFEWAY  ', [
      { normalizedMerchant: 'safeway', category: 'Grocery' },
    ])).toBe('Grocery')
  })

  it('returns null when the merchant has no exact rule', () => {
    expect(defaultCategoryForMerchant('Safeway fuel', [
      { normalizedMerchant: 'safeway', category: 'Grocery' },
    ])).toBeNull()
  })
})
