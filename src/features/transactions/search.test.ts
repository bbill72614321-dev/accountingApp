import { describe, expect, it } from 'vitest'
import { searchTransactions, searchSpending } from './search'

const rows = [
  { raw_description: 'WHOLE FOODS #123', note: '', amount_cents: -10000, transaction_split: { personal_amount_cents: 5000 }, excluded_from_report: true },
  { raw_description: 'Market', note: 'Whole food groceries', amount_cents: -2000, transaction_split: null, excluded_from_report: false },
  { raw_description: 'WHOLE FOODS refund', note: '', amount_cents: 1000, transaction_split: null, excluded_from_report: false },
]

describe('transaction search', () => {
  it('matches merchant or notes case-insensitively and keeps skipped rows', () => {
    expect(searchTransactions(rows, '  whole food  ')).toEqual(rows)
    expect(searchTransactions(rows, 'groceries')).toEqual([rows[1]])
    expect(searchTransactions(rows, 'missing')).toEqual([])
    expect(searchTransactions(rows, ' ')).toEqual(rows)
  })
  it('totals original expenses and personal shares without counting incoming refunds as spending', () => {
    expect(searchSpending(rows)).toEqual({ original: 12000, personal: 7000, hasSplit: true })
    expect(searchSpending([])).toEqual({ original: 0, personal: 0, hasSplit: false })
  })
})
