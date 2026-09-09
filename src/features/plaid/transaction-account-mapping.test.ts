import { describe, expect, it } from 'vitest'
import { requireLinkedBankAccountId } from './transaction-account-mapping'

describe('requireLinkedBankAccountId', () => {
  it('returns the local bank account for the Plaid account that owns the transaction', () => {
    const linkedAccounts = new Map([
      ['plaid-credit-card', 'local-credit-card'],
      ['plaid-checking', 'local-checking'],
    ])

    expect(requireLinkedBankAccountId(linkedAccounts, 'plaid-checking')).toBe('local-checking')
  })

  it('rejects a transaction whose Plaid account was not saved for the linked item', () => {
    expect(() => requireLinkedBankAccountId(new Map(), 'unknown-plaid-account'))
      .toThrow('Unable to find the linked bank account for this Plaid transaction')
  })
})
