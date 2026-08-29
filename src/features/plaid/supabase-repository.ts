import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptAccessToken } from '@/lib/plaid/crypto'
import type { PlaidSyncRepository } from './sync-owned-item'

export function createSupabasePlaidRepository(admin: SupabaseClient): PlaidSyncRepository {
  return {
    async findOwnedItem(userId, itemId) {
      const { data: item } = await admin.from('bank_items').select('id, cursor').eq('id', itemId).eq('user_id', userId).maybeSingle()
      if (!item) return null
      const { data: secret } = await admin.from('plaid_item_secrets').select('access_token_ciphertext, access_token_iv, access_token_tag').eq('bank_item_id', itemId).maybeSingle()
      if (!secret) return null
      return {
        cursor: item.cursor,
        accessToken: decryptAccessToken({ ciphertext: secret.access_token_ciphertext, iv: secret.access_token_iv, tag: secret.access_token_tag }),
      }
    },
    async upsertAccounts() {},
    async upsertTransactions(rows) {
      if (rows.length === 0) return
      const records = rows.map((row) => ({
        user_id: row.userId, source: 'plaid', external_id: row.externalId,
        raw_description: row.rawDescription, normalized_merchant: row.normalizedMerchant,
        transaction_date: row.transactionDate, amount_cents: row.amountCents,
        pending: row.providerPending, provider_pending: row.providerPending,
        review_status: row.reviewStatus, original_currency_code: row.currency,
      }))
      const { error } = await admin.from('transactions').upsert(records, { onConflict: 'user_id,source,external_id' })
      if (error) throw new Error('Unable to save Plaid transactions')
    },
    async removeTransactions(userId, externalIds) {
      if (externalIds.length === 0) return
      const { error } = await admin.from('transactions').delete().eq('user_id', userId).eq('source', 'plaid').in('external_id', externalIds)
      if (error) throw new Error('Unable to remove Plaid transactions')
    },
    async updateCursor(itemId, cursor) {
      const { error } = await admin.from('bank_items').update({ cursor, last_synced_at: new Date().toISOString(), status: 'active' }).eq('id', itemId)
      if (error) throw new Error('Unable to save Plaid cursor')
    },
  }
}
