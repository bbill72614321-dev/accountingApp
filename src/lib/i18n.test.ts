import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCookie: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  query: {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: mocks.getCookie })) }))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from })),
}))

import { dictionaries, getLanguage } from './i18n'

describe('translations', () => {
  it('keeps English and Traditional Chinese keys identical', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['zh-TW']).sort())
  })

  it('translates the language switcher options', () => {
    expect(dictionaries.en.traditionalChinese).toBe('Traditional Chinese')
    expect(dictionaries['zh-TW'].traditionalChinese).toBe('繁體中文')
    expect(dictionaries.en.english).toBe('English')
    expect(dictionaries['zh-TW'].english).toBe('英文')
  })

  it('translates the private ledger description', () => {
    expect(dictionaries.en.privateLedgerDescription).toBe('Your monthly picture, kept personal.')
    expect(dictionaries['zh-TW'].privateLedgerDescription).toBe('你的每月帳務，只屬於你。')
  })

  describe('getLanguage', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mocks.from.mockReturnValue(mocks.query)
      mocks.query.select.mockReturnValue(mocks.query)
      mocks.query.eq.mockReturnValue(mocks.query)
      mocks.getCookie.mockReturnValue({ value: 'zh-TW' })
      mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      mocks.query.maybeSingle.mockResolvedValue({ data: { language: 'en' }, error: null })
    })

    it('prefers the authenticated user profile over the language cookie', async () => {
      await expect(getLanguage()).resolves.toBe('en')
      expect(mocks.from).toHaveBeenCalledWith('profiles')
      expect(mocks.query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('falls back to the cookie when profile lookup is unavailable', async () => {
      mocks.query.maybeSingle.mockRejectedValue(new Error('profile unavailable'))
      await expect(getLanguage()).resolves.toBe('zh-TW')
    })

    it('defaults to Traditional Chinese without a session or cookie', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
      mocks.getCookie.mockReturnValue(undefined)
      await expect(getLanguage()).resolves.toBe('zh-TW')
    })
  })
})
