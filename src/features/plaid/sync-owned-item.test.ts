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

function createRepository(): PlaidSyncRepository & { transactions: ImportedTransaction[]; cursors: string[] } {
  const transactions: ImportedTransaction[] = []
  const cursors: string[] = []
  return {
    transactions,
    cursors,
    async findOwnedItem(userId, itemId) {
      return userId === 'user-a' && itemId === 'item-a'
        ? { accessToken: 'encrypted-token', cursor: null }
        : null
    },
    async upsertAccounts() {},
    async upsertTransactions(rows) {
      for (const row of rows) {
        const index = transactions.findIndex((candidate) => candidate.externalId === row.externalId)
        if (index === -1) transactions.push(row)
        else transactions[index] = row
      }
    },
    async removeTransactions() {},
    async updateCursor(_itemId, cursor) { cursors.push(cursor) },
  }
}

const gateway: PlaidGateway = {
  async syncTransactions() {
    return { added: [transaction], modified: [], removed: [], nextCursor: 'cursor-1', hasMore: false }
  },
}

describe('syncOwnedItem', () => {
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
