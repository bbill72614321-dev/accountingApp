import { describe, expect, it } from 'vitest'
import { canSaveSplitPayment, defaultPersonalShareCents, effectiveReportAmountCents, owedAmountCents } from './split-payment'

describe('split payments', () => {
  it('defaults the personal share to an equal portion of an outgoing transaction', () => {
    expect(defaultPersonalShareCents(-12_001, 2)).toBe(6_001)
  })

  it('uses only the personal share in the monthly report', () => {
    expect(effectiveReportAmountCents(-12_000, 4_000)).toBe(-4_000)
  })

  it('keeps an unsplit transaction at its original amount', () => {
    expect(effectiveReportAmountCents(-12_000, null)).toBe(-12_000)
  })

  it('calculates the amount owed by others after the personal share', () => {
    expect(owedAmountCents(12_000, 4_000)).toBe(8_000)
  })

  it('only allows a split for an outgoing transaction with a valid personal share', () => {
    expect(canSaveSplitPayment({ amountCents: -12_000, splitCount: 2, personalAmountCents: 6_000 })).toBe(true)
    expect(canSaveSplitPayment({ amountCents: 12_000, splitCount: 2, personalAmountCents: 6_000 })).toBe(false)
    expect(canSaveSplitPayment({ amountCents: -12_000, splitCount: 2, personalAmountCents: 12_001 })).toBe(false)
  })
})
