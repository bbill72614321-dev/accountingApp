import { describe, expect, it, vi } from 'vitest'
import { dictionaries } from '@/lib/i18n'

const requireUser = vi.hoisted(() => vi.fn(async () => ({ id: 'user-1' })))
const createServerClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ requireUser }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { confirmImportedTransaction, createManualTransaction, updateManualTransaction } from './transactions'

describe('transaction action messages', () => {
  it('returns a dictionary key for invalid manual transaction fields', async () => {
    const result = await createManualTransaction({ status: 'idle', message: '' }, new FormData())

    expect(result.message).toBe('invalidTransaction')
    expect(dictionaries['zh-TW'].invalidTransaction).toBe('請檢查交易欄位後再試。')
  })
})

describe('updateManualTransaction', () => {
  it('uses one RPC to reconcile the effective category and merchant rule', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const maybeSingle = vi.fn(async () => ({ data: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, error: null }))
    const select = vi.fn(() => ({ maybeSingle }))
    const eqSource = vi.fn(() => ({ select }))
    const eqUser = vi.fn(() => ({ eq: eqSource }))
    const eqId = vi.fn(() => ({ eq: eqUser }))
    const update = vi.fn(() => ({ eq: eqId }))
    const from = vi.fn(() => ({ update }))
    createServerClient.mockResolvedValue({ from, rpc })
    const formData = new FormData()
    formData.set('transaction_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    formData.set('merchant', " Trader Joe's #142 ")
    formData.set('category', 'Cat')
    formData.set('date', '2026-08-27')
    formData.set('amount', '12.34')
    formData.set('type', 'expense')
    formData.set('note', ' Cat food ')

    await updateManualTransaction({ status: 'idle', message: '' }, formData)

    expect(rpc).toHaveBeenCalledWith('update_manual_transaction_and_rule', {
      p_transaction_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_merchant: "Trader Joe's #142",
      p_normalized_merchant: 'TRADER JOES 142',
      p_category: 'Cat',
      p_transaction_date: '2026-08-27',
      p_amount_cents: -1234,
      p_note: 'Cat food',
    })
  })
})

describe('confirmImportedTransaction', () => {
  it('rejects confirming another user\'s imported transaction', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    const select = vi.fn(() => ({ maybeSingle }))
    const reviewStatus = vi.fn(() => ({ select }))
    const providerPending = vi.fn(() => ({ eq: reviewStatus }))
    const source = vi.fn(() => ({ eq: providerPending }))
    const user = vi.fn(() => ({ eq: source }))
    const id = vi.fn(() => ({ eq: user }))
    const update = vi.fn(() => ({ eq: id }))
    const from = vi.fn(() => ({ update }))
    createServerClient.mockResolvedValue({ from })
    const formData = new FormData()
    formData.set('transaction_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')

    await expect(confirmImportedTransaction(formData)).rejects.toThrow('Unable to confirm transaction')
  })
})
