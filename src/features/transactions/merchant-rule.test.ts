import { describe, expect, it } from 'vitest'
import { displayedCategory, effectiveCategoryFilter } from './merchant-rule'

describe('displayedCategory', () => {
  it('prefers the user override over the mapped source category', () => {
    expect(displayedCategory({ sourceCategory: 'Shopping', categoryOverride: 'Cat' })).toBe('Cat')
  })

  it('falls back to the source category', () => {
    expect(displayedCategory({ sourceCategory: 'Grocery', categoryOverride: null })).toBe('Grocery')
  })
})

describe('effectiveCategoryFilter', () => {
  it('matches the source category only when no override exists', () => {
    expect(effectiveCategoryFilter('Grocery')).toBe(
      'category_override.eq."Grocery",and(category_override.is.null,source_category.eq."Grocery")',
    )
  })
})
