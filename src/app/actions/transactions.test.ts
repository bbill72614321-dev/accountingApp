import { describe, expect, it, vi } from 'vitest'
import { dictionaries } from '@/lib/i18n'

const requireUser = vi.hoisted(() => vi.fn(async () => ({ id: 'user-1' })))
vi.mock('@/lib/auth', () => ({ requireUser }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { createManualTransaction } from './transactions'

describe('transaction action messages', () => {
  it('returns a dictionary key for invalid manual transaction fields', async () => {
    const result = await createManualTransaction({ status: 'idle', message: '' }, new FormData())

    expect(result.message).toBe('invalidTransaction')
    expect(dictionaries['zh-TW'].invalidTransaction).toBe('請檢查交易欄位後再試。')
  })
})
