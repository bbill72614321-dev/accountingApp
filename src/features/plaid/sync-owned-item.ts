export type PlaidProviderTransaction = {
  transactionId: string
  accountId: string
  date: string
  amount: number
  pending: boolean
  name: string
  merchantName?: string | null
  currencyCode?: string | null
}

export type PlaidSyncPage = {
  added: PlaidProviderTransaction[]
  modified: PlaidProviderTransaction[]
  removed: { transactionId: string }[]
  nextCursor: string
  hasMore: boolean
}

export type PlaidGateway = {
  syncTransactions(input: { accessToken: string; cursor: string | null }): Promise<PlaidSyncPage>
}

export type ImportedTransaction = {
  userId: string
  itemId: string
  externalId: string
  providerAccountId: string
  rawDescription: string
  normalizedMerchant: string
  transactionDate: string
  amountCents: number
  providerPending: boolean
  reviewStatus: 'needs_review'
  currency: string | null
}

export type PlaidSyncRepository = {
  findOwnedItem(userId: string, itemId: string): Promise<{ accessToken: string; cursor: string | null } | null>
  upsertAccounts(itemId: string, accounts: unknown[]): Promise<void>
  upsertTransactions(rows: ImportedTransaction[]): Promise<void>
  removeTransactions(userId: string, externalIds: string[]): Promise<void>
  updateCursor(itemId: string, cursor: string): Promise<void>
}

function toImportedTransaction(userId: string, itemId: string, transaction: PlaidProviderTransaction): ImportedTransaction {
  const merchant = transaction.merchantName?.trim() || transaction.name.trim()
  return {
    userId,
    itemId,
    externalId: transaction.transactionId,
    providerAccountId: transaction.accountId,
    rawDescription: transaction.name,
    normalizedMerchant: merchant.toUpperCase(),
    transactionDate: transaction.date,
    amountCents: -Math.round(transaction.amount * 100),
    providerPending: transaction.pending,
    reviewStatus: 'needs_review',
    currency: transaction.currencyCode ?? null,
  }
}

export async function syncOwnedItem({
  userId,
  itemId,
  gateway,
  repository,
}: {
  userId: string
  itemId: string
  gateway: PlaidGateway
  repository: PlaidSyncRepository
}) {
  const item = await repository.findOwnedItem(userId, itemId)
  if (!item) throw new Error('Not found')

  let cursor = item.cursor
  let hasMore: boolean
  do {
    const page = await gateway.syncTransactions({ accessToken: item.accessToken, cursor })
    const rows = [...page.added, ...page.modified].map((transaction) => toImportedTransaction(userId, itemId, transaction))
    if (rows.length > 0) await repository.upsertTransactions(rows)
    if (page.removed.length > 0) await repository.removeTransactions(userId, page.removed.map(({ transactionId }) => transactionId))
    cursor = page.nextCursor
    if (!page.hasMore) await repository.updateCursor(itemId, cursor)
    hasMore = page.hasMore
  } while (hasMore)
}
