import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BankAccountAccess, BankAccountChanges } from './bank-account-access'
import { dictionaries } from '@/lib/i18n'

const accounts = [
  { plaid_account_id: 'active', name: 'Card', display_name: '日常卡', mask: '1234' },
  { plaid_account_id: 'old', name: 'Savings', display_name: null, mask: '5678' },
]

describe('BankAccountAccess', () => {
  it('shows verified access and missing accounts without removing historical accounts', () => {
    const html = renderToStaticMarkup(<BankAccountAccess accounts={accounts} snapshot={{ accountIds: ['active'], checkedAt: '2026-11-03T12:00:00Z' }} dictionary={dictionaries['zh-TW']} language="zh-TW" />)
    expect(html).toContain('日常卡')
    expect(html).toContain('1234')
    expect(html).toContain('5678')
    expect(html).toContain('已授權')
    expect(html).toContain('未在目前授權清單')
  })

  it('does not present legacy cached accounts as authorized', () => {
    const html = renderToStaticMarkup(<BankAccountAccess accounts={accounts} snapshot={null} dictionary={dictionaries['zh-TW']} language="zh-TW" />)
    expect(html).toContain('尚未確認')
    expect(html).not.toContain('已授權</')
  })

  it('shows a confirmed empty authorization list', () => {
    const html = renderToStaticMarkup(<BankAccountAccess accounts={[]} snapshot={{ accountIds: [], checkedAt: '2026-11-03T12:00:00Z' }} dictionary={dictionaries.en} language="en" />)
    expect(html).toContain('No accounts are currently shared')
  })
})


it('renders all update groups with names and counts, including lost accounts', () => {
  const html = renderToStaticMarkup(<BankAccountChanges changes={{ added: [], retained: ['active'], removed: ['old'] }} accounts={accounts} dictionary={dictionaries['zh-TW']} />)
  expect(html).toContain('新增／恢復授權 · 0')
  expect(html).toContain('保留授權 · 1')
  expect(html).toContain('失去授權 · 1')
  expect(html).toContain('Savings · ••5678')
})
