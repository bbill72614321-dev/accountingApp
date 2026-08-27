import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS } from './categories'

describe('categories', () => {
  it('contains the approved categories in stable order', () => {
    expect(CATEGORIES).toEqual([
      'Travel', 'Grocery', 'Shopping', 'Car', 'Dine Out', 'Utility',
      'Entertainment', 'Learning', 'Home', 'Cat', 'Other',
    ])
  })

  it('has both labels for every category', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category].en).toBeTruthy()
      expect(CATEGORY_LABELS[category]['zh-TW']).toBeTruthy()
    }
  })
})
