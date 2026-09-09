import { describe, expect, it } from 'vitest'
import { availableMonths, adjacentMonth } from './month-navigation'

describe('month navigation', () => {
  it('keeps the current month and sorts transaction months newest first', () => {
    expect(availableMonths(['2026-07-02', '2026-09-03', '2026-08-30'], '2026-09')).toEqual([
      '2026-09', '2026-08', '2026-07',
    ])
  })

  it('moves only to an available adjacent month', () => {
    const months = ['2026-09', '2026-08', '2026-07']
    expect(adjacentMonth(months, '2026-08', 'newer')).toBe('2026-09')
    expect(adjacentMonth(months, '2026-08', 'older')).toBe('2026-07')
    expect(adjacentMonth(months, '2026-09', 'newer')).toBeNull()
  })
})
