import { describe, expect, it } from 'vitest'
import { countPendingMonth, isReportEligible, summarizeMonth, type SummaryTransaction } from './monthly-summary'

const tx = (overrides: Partial<SummaryTransaction>): SummaryTransaction => ({
  date: '2026-08-10', amountCents: -1000, category: 'Other',
  pending: false, includeInReport: true, ...overrides,
})

describe('summarizeMonth', () => {
  it('includes only confirmed, posted USD transactions in reports', () => {
    expect(isReportEligible({ includeInReport: true, providerPending: false, reviewStatus: 'confirmed', currency: 'USD' })).toBe(true)
    expect(isReportEligible({ includeInReport: true, providerPending: false, reviewStatus: 'needs_review', currency: 'USD' })).toBe(false)
    expect(isReportEligible({ includeInReport: true, providerPending: true, reviewStatus: 'confirmed', currency: 'USD' })).toBe(false)
  })

  it('calculates spending, refunds, income, exclusions, and net amount', () => {
    const summary = summarizeMonth([
      tx({ amountCents: -5000, category: 'Grocery' }),
      tx({ amountCents: 1000, category: 'Grocery' }),
      tx({ amountCents: 10000, category: null }),
      tx({ amountCents: -2500, category: 'Travel', includeInReport: false }),
      tx({ amountCents: -999, category: 'Other', pending: true }),
      tx({ date: '2026-07-31', amountCents: -3000 }),
    ], '2026-08')

    expect(summary.totalSpendingCents).toBe(4000)
    expect(summary.netAmountCents).toBe(6000)
    expect(summary.categorySpending.Grocery).toBe(4000)
    expect(summary.categorySpending.Travel).toBe(0)
  })

  it('counts only in-month pending transactions for review', () => {
    expect(countPendingMonth([
      tx({ pending: true }),
      tx({ pending: false }),
      tx({ pending: true, date: '2026-07-31' }),
    ], '2026-08')).toBe(1)
  })
})
