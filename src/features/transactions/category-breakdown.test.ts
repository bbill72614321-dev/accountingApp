import { describe, expect, it } from 'vitest'
import { buildCategoryBreakdown } from './category-breakdown'

describe('buildCategoryBreakdown', () => {
  const spending = {
    Travel: 2_000, Grocery: 3_000, Shopping: 0, Car: 0, 'Dine Out': 0,
    Utility: 0, Entertainment: 0, Learning: 0, Home: 15_000, Cat: 0, Other: 0,
  }

  it('sorts by spending and recalculates percentages after Home is excluded', () => {
    const breakdown = buildCategoryBreakdown(spending, 'Home')

    expect(breakdown.totalCents).toBe(5_000)
    expect(breakdown.rows).toEqual([
      { category: 'Grocery', valueCents: 3_000, percentage: 60 },
      { category: 'Travel', valueCents: 2_000, percentage: 40 },
    ])
  })

  it('adds uncategorized spending as a display-only category and sorts it by amount', () => {
    const breakdown = buildCategoryBreakdown(spending, undefined, 4_000)

    expect(breakdown.rows).toEqual([
      { category: 'Home', valueCents: 15_000, percentage: 62.5 },
      { category: 'Uncategorized', valueCents: 4_000, percentage: 16.7 },
      { category: 'Grocery', valueCents: 3_000, percentage: 12.5 },
      { category: 'Travel', valueCents: 2_000, percentage: 8.3 },
    ])
  })
})
