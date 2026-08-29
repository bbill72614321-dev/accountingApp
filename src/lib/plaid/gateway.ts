import 'server-only'

import type { PlaidApi } from 'plaid'
import type { PlaidGateway } from '@/features/plaid/sync-owned-item'

export function createPlaidGateway(client: PlaidApi): PlaidGateway {
  return {
    async syncTransactions({ accessToken, cursor }) {
      const { data } = await client.transactionsSync({
        access_token: accessToken,
        cursor: cursor ?? undefined,
        options: { include_personal_finance_category: true },
      })
      const map = (transaction: typeof data.added[number]) => ({
        transactionId: transaction.transaction_id,
        accountId: transaction.account_id,
        date: transaction.date,
        amount: transaction.amount,
        pending: transaction.pending,
        name: transaction.name,
        merchantName: transaction.merchant_name,
        currencyCode: transaction.iso_currency_code,
      })
      return {
        added: data.added.map(map), modified: data.modified.map(map),
        removed: data.removed.map(({ transaction_id }) => ({ transactionId: transaction_id })),
        nextCursor: data.next_cursor, hasMore: data.has_more,
      }
    },
  }
}
