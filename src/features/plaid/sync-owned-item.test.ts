import { describe, expect, it } from 'vitest'
import {
  syncOwnedItem,
  type ImportedTransaction,
  type PlaidGateway,
  type PlaidSyncRepository,
} from './sync-owned-item'

const transaction = {
  transactionId: 'transaction-1',
  accountId: 'account-1',
  date: '2026-08-01',
  amount: 12.34,
  pending: false,
  name: 'Coffee shop',
  merchantName: 'Coffee Shop',
  currencyCode: 'USD',
}

function createRepository(): PlaidSyncRepository & {
  transactions: ImportedTransaction[]
  cursors: string[]
  removals: Array<{ userId: string; itemId: string; externalIds: string[] }>
  savedAccounts: string[]
} {
  const transactions: ImportedTransaction[] = []
  const cursors: string[] = []
  const removals: Array<{ userId: string; itemId: string; externalIds: string[] }> = []
  const savedAccounts: string[] = []
  return {
    transactions,
    cursors,
    removals,
    savedAccounts,
    async findOwnedItem(userId, itemId) {
      return userId === 'user-a' && itemId === 'item-a'
        ? { accessToken: 'encrypted-token', cursor: null }
        : null
    },
    async upsertAccounts(_userId, _itemId, accounts) { savedAccounts.push(...accounts.map((account) => account.accountId)) },
    async upsertTransactions(rows) {
      for (const row of rows) {
        const index = transactions.findIndex((candidate) => candidate.externalId === row.externalId)
        if (index === -1) transactions.push(row)
        else transactions[index] = row
      }
    },
    async removeTransactions(userId, itemId, externalIds) { removals.push({ userId, itemId, externalIds }) },
    async updateCursor(_itemId, cursor) { cursors.push(cursor) },
  }
}

const gateway: PlaidGateway = {
  async removeItem() {},
  async getAccounts() { return [{ accountId: 'account-1', name: 'Credit card', officialName: null, mask: '1234', type: 'credit', subtype: 'credit card' }] },
  async syncTransactions() {
    return { added: [transaction], modified: [], removed: [], nextCursor: 'cursor-1', hasMore: false }
  },
}

describe('syncOwnedItem', () => {
  it('saves the newly shared account before importing its transactions', async () => {
    const repository = createRepository()
    const events: string[] = []
    const saveAccounts = repository.upsertAccounts
    const saveTransactions = repository.upsertTransactions
    repository.upsertAccounts = async (userId, itemId, accounts) => { events.push('accounts'); await saveAccounts(userId, itemId, accounts) }
    repository.upsertTransactions = async (rows) => { events.push('transactions'); await saveTransactions(rows) }

    await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })

    expect(repository.savedAccounts).toEqual(['account-1'])
    expect(events).toEqual(['accounts', 'transactions'])
  })

  it('upserts imported transactions once across repeated cursor syncs', async () => {
    const repository = createRepository()

    await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })
    await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })

    expect(repository.transactions).toHaveLength(1)
    expect(repository.transactions[0]).toMatchObject({
      amountCents: -1234,
      reviewStatus: 'needs_review',
      providerPending: false,
    })
  })

  it('rejects another user attempting to sync an item they do not own', async () => {
    await expect(syncOwnedItem({ userId: 'user-b', itemId: 'item-a', gateway, repository: createRepository() }))
      .rejects.toThrow('Not found')
  })

  it('continues until Plaid reports the final cursor page', async () => {
    const repository = createRepository()
    const paginatedGateway: PlaidGateway = {
      async removeItem() {},
      async getAccounts() { return [] },
      async syncTransactions({ cursor }) {
        if (!cursor) return { added: [transaction], modified: [], removed: [], nextCursor: 'cursor-page-2', hasMore: true }
        return {
          added: [{ ...transaction, transactionId: 'transaction-2' }],
          modified: [], removed: [], nextCursor: 'cursor-final', hasMore: false,
        }
      },
    }

    await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway: paginatedGateway, repository })

    expect(repository.transactions).toHaveLength(2)
    expect(repository.cursors).toEqual(['cursor-final'])
  })
})

it('scopes provider removals to the synced item', async () => {
  const repository = createRepository()
  const removalGateway: PlaidGateway = {
    async removeItem() {},
    async getAccounts() { return [] },
    async syncTransactions() {
      return { added: [], modified: [], removed: [{ transactionId: 'transaction-1' }], nextCursor: 'cursor-1', hasMore: false }
    },
  }

  await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway: removalGateway, repository })

  expect(repository.removals).toEqual([{ userId: 'user-a', itemId: 'item-a', externalIds: ['transaction-1'] }])
})
