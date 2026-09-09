import { describe, expect, it } from 'vitest'
import { compareTransactionDisplayOrder } from './display-order'

describe('compareTransactionDisplayOrder', () => {
  it('keeps transactions with the same date and creation time in a stable ID order', () => {
    const rows = [
      { id: 'a-older', transactionDate: '2026-09-08', createdAt: '2026-09-09T17:54:33.133914+00:00' },
      { id: 'z-newer', transactionDate: '2026-09-08', createdAt: '2026-09-09T17:54:33.133914+00:00' },
    ]

    expect(rows.toSorted(compareTransactionDisplayOrder).map((row) => row.id)).toEqual(['z-newer', 'a-older'])
  })
})
