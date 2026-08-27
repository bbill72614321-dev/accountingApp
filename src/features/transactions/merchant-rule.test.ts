import { describe, expect, it } from 'vitest'
import { displayedCategory } from './merchant-rule'

describe('displayedCategory', () => {
  it('prefers the user override over the mapped source category', () => {
    expect(displayedCategory({ sourceCategory: 'Shopping', categoryOverride: 'Cat' })).toBe('Cat')
  })

  it('falls back to the source category', () => {
    expect(displayedCategory({ sourceCategory: 'Grocery', categoryOverride: null })).toBe('Grocery')
  })
})
