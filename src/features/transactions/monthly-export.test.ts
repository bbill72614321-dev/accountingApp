import { describe, expect, it } from 'vitest'
import { buildMonthlyExportData } from './monthly-export'

describe('buildMonthlyExportData', () => {
  it('uses the same included finalized transactions and totals as the monthly report', () => {
    const report = buildMonthlyExportData({
      language: 'en',
      month: '2026-08',
      transactions: [
        { merchant: 'Target', category: 'Grocery', date: '2026-08-01', amountCents: -1234, note: 'Pantry', pending: false, includeInReport: true },
        { merchant: 'Payroll', category: null, date: '2026-08-02', amountCents: 50000, note: '', pending: false, includeInReport: true },
        { merchant: 'Pending', category: 'Other', date: '2026-08-03', amountCents: -100, note: '', pending: true, includeInReport: true },
      ],
    })

    expect(report.summary).toMatchObject({ totalSpendingCents: 1234, netAmountCents: 48766 })
    expect(report.categoryRows).toEqual([{ category: 'Grocery', amountCents: 1234 }])
    expect(report.transactionRows).toEqual([
      ['Target', 'Grocery', '2026-08-01', -1234, 'Pantry'],
      ['Payroll', 'Income / no spending category', '2026-08-02', 50000, ''],
    ])
  })
})
