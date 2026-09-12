import { describe, expect, it } from 'vitest'
import { filterReportRowsByReview } from './review-filter'

describe('filterReportRowsByReview', () => {
  const rows = [
    { id: 'reviewed', user_reviewed_at: '2026-09-12T00:00:00Z' },
    { id: 'unreviewed', user_reviewed_at: null },
  ]

  it('keeps every report row for the all-transactions filter', () => {
    expect(filterReportRowsByReview(rows, 'all').map((row) => row.id)).toEqual(['reviewed', 'unreviewed'])
  })

  it('shows only rows without a personal review timestamp for the unreviewed filter', () => {
    expect(filterReportRowsByReview(rows, 'unreviewed').map((row) => row.id)).toEqual(['unreviewed'])
  })
})
