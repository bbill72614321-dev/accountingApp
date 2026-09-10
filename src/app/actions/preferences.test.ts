import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  setCookie: vi.fn(),
  revalidatePath: vi.fn(),
  from: vi.fn(),
  query: { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() },
}))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ set: mocks.setCookie })) }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'user-1' })) }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(async () => ({ from: mocks.from })) }))

import { setLanguage } from './preferences'

describe('setLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue(mocks.query)
    mocks.query.update.mockReturnValue(mocks.query)
    mocks.query.eq.mockReturnValue(mocks.query)
    mocks.query.select.mockReturnValue(mocks.query)
    mocks.query.single.mockResolvedValue({ data: { language: 'en' }, error: null })
  })

  it('persists the selected language before returning it to the client', async () => {
    await expect(setLanguage('en')).resolves.toBe('en')

    expect(mocks.query.update).toHaveBeenCalledWith({ language: 'en' })
    expect(mocks.query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mocks.setCookie).toHaveBeenCalledWith('app-language', 'en', expect.any(Object))
  })
})
