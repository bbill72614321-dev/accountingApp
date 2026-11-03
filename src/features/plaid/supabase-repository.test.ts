import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@/lib/plaid/crypto', () => ({ decryptAccessToken: vi.fn() }))
import { createSupabasePlaidRepository } from './supabase-repository'

function setup(accountError: unknown = null, snapshotError: unknown = null) {
  const accountUpsert = vi.fn().mockResolvedValue({ error: accountError })
  const query = {
    eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'item-a' }, error: snapshotError }),
  }
  const update = vi.fn().mockReturnValue(query)
  const from = vi.fn((table: string) => {
    if (table === 'bank_accounts') return { upsert: accountUpsert }
    if (table === 'bank_items') return { update }
    throw new Error(`Unexpected write to ${table}`)
  })
  return { repository: createSupabasePlaidRepository({ from } as unknown as SupabaseClient), accountUpsert, update, query }
}

const account = { accountId: 'card-a', name: 'Card', officialName: null, mask: '1234', type: 'credit', subtype: 'credit card' }

describe('saving account access snapshots', () => {
  it('records an empty verified list without deleting historical accounts or transactions', async () => {
    const { repository, accountUpsert, update, query } = setup()
    await repository.upsertAccounts('user-a', 'item-a', [])
    expect(accountUpsert).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ account_access_snapshot: { accountIds: [], checkedAt: expect.any(String) } })
    expect(query.eq.mock.calls).toEqual([['id', 'item-a'], ['user_id', 'user-a']])
  })

  it('saves a snapshot only after the current accounts are saved', async () => {
    const { repository, accountUpsert, update } = setup()
    await repository.upsertAccounts('user-a', 'item-a', [account])
    expect(accountUpsert.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0])
    expect(update).toHaveBeenCalledWith({ account_access_snapshot: { accountIds: ['card-a'], checkedAt: expect.any(String) } })
  })

  it('leaves the last known snapshot intact when account storage fails', async () => {
    const { repository, update } = setup({ message: 'failed' })
    await expect(repository.upsertAccounts('user-a', 'item-a', [account])).rejects.toThrow('Unable to save linked bank accounts')
    expect(update).not.toHaveBeenCalled()
  })

  it('does not report success if saving access status fails', async () => {
    const { repository } = setup(null, { message: 'failed' })
    await expect(repository.upsertAccounts('user-a', 'item-a', [])).rejects.toThrow('Unable to save account access status')
  })
})
