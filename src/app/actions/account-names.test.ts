import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  rows: [
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: 'user-one', display_name: null as string | null },
    { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_id: 'user-two', display_name: null as string | null },
  ],
}))
vi.mock('@/lib/auth', () => ({ requireUser: async () => ({ id: 'user-one' }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ update: (values: { display_name: string | null }) => {
    const filters: Record<string, string> = {}
    const query = {
      eq: (key: string, value: string) => { filters[key] = value; return query },
      select: () => query,
      maybeSingle: async () => {
        const row = store.rows.find((row) => row.id === filters.id && row.user_id === filters.user_id)
        if (row) row.display_name = values.display_name
        return { data: row ? { id: row.id } : null, error: null }
      },
    }
    return query
  } }) }),
}))

import { renameBankAccount } from './account-names'

function input(account: string, name: string) {
  const form = new FormData()
  form.set('account_id', account)
  form.set('display_name', name)
  return form
}

describe('renameBankAccount', () => {
  beforeEach(() => { store.rows.forEach((row) => { row.display_name = null }) })

  it('saves a trimmed nickname on the signed-in user account', async () => {
    expect(await renameBankAccount({ status: 'idle' }, input(store.rows[0].id, '  Chase 日常卡  '))).toEqual({ status: 'success' })
    expect(store.rows[0].display_name).toBe('Chase 日常卡')
  })

  it('rejects another user account even when its id is submitted', async () => {
    expect(await renameBankAccount({ status: 'idle' }, input(store.rows[1].id, 'Wrong owner'))).toEqual({ status: 'error' })
    expect(store.rows[1].display_name).toBeNull()
  })

  it('clears a nickname so the bank name can be used again', async () => {
    store.rows[0].display_name = 'Old nickname'
    expect(await renameBankAccount({ status: 'idle' }, input(store.rows[0].id, '   '))).toEqual({ status: 'success' })
    expect(store.rows[0].display_name).toBeNull()
  })

  it('rejects malformed ids and names over 60 characters', async () => {
    expect(await renameBankAccount({ status: 'idle' }, input('invalid', 'Name'))).toEqual({ status: 'error' })
    expect(await renameBankAccount({ status: 'idle' }, input(store.rows[0].id, 'x'.repeat(61)))).toEqual({ status: 'error' })
    expect(store.rows[0].display_name).toBeNull()
  })
})
