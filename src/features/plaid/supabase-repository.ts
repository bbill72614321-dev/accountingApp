import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptAccessToken } from '@/lib/plaid/crypto'
import type { OwnedItemDeletionRepository } from './disconnect-owned-item'
import type { PlaidSyncRepository } from './sync-owned-item'
import { requireLinkedBankAccountId } from './transaction-account-mapping'
import { defaultCategoryForMerchant, type MerchantCategoryRule } from './default-category'

export function createSupabasePlaidRepository(admin: SupabaseClient): PlaidSyncRepository & OwnedItemDeletionRepository {
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
      const firstRow = rows[0]
      const plaidAccountIds = [...new Set(rows.map((row) => row.providerAccountId))]
      const { data: accounts, error: accountsError } = await admin.from('bank_accounts')
        .select('id, plaid_account_id')
        .eq('user_id', firstRow.userId)
        .eq('bank_item_id', firstRow.itemId)
        .in('plaid_account_id', plaidAccountIds)
      if (accountsError) throw new Error('Unable to load linked bank accounts')
      const localAccountIdByPlaidAccountId = new Map((accounts ?? []).map((account) => [account.plaid_account_id, account.id]))
      const { data: merchantRules, error: merchantRulesError } = await admin.from('merchant_rules')
        .select('normalized_merchant, category')
        .eq('user_id', firstRow.userId)
      if (merchantRulesError) throw new Error('Unable to load merchant category rules')
      const rules: MerchantCategoryRule[] = (merchantRules ?? []).map((rule) => ({
        normalizedMerchant: rule.normalized_merchant,
        category: rule.category,
      }))
      const records = rows.map((row) => ({
        user_id: row.userId, source: 'plaid', external_id: row.externalId,
        bank_item_id: row.itemId, bank_account_id: requireLinkedBankAccountId(localAccountIdByPlaidAccountId, row.providerAccountId),
        raw_description: row.rawDescription, normalized_merchant: row.normalizedMerchant,
        transaction_date: row.transactionDate, amount_cents: row.amountCents,
        pending: row.providerPending, provider_pending: row.providerPending,
        review_status: row.reviewStatus, original_currency_code: row.currency,
        source_category: defaultCategoryForMerchant(row.normalizedMerchant, rules),
      }))
      const { error } = await admin.from('transactions').upsert(records, { onConflict: 'user_id,source,external_id' })
      if (error) throw new Error('Unable to save Plaid transactions')
    },
    async removeTransactions(userId, itemId, externalIds) {
      if (externalIds.length === 0) return
      const { error } = await admin.from('transactions').delete()
        .eq('user_id', userId).eq('source', 'plaid').eq('bank_item_id', itemId).in('external_id', externalIds)
      if (error) throw new Error('Unable to remove Plaid transactions')
    },
    async deleteOwnedItem(userId, itemId) {
      const { data, error } = await admin.from('bank_items').delete()
        .eq('id', itemId).eq('user_id', userId).select('id').maybeSingle()
      if (error || !data) throw new Error('Unable to delete bank connection')
    },
    async updateCursor(itemId, cursor) {
      const { error } = await admin.from('bank_items').update({ cursor, last_synced_at: new Date().toISOString(), status: 'active' }).eq('id', itemId)
      if (error) throw new Error('Unable to save Plaid cursor')
    },
  }
}
