import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { dictionaries } from '@/lib/i18n'

vi.mock('./transaction-table', () => ({
  TransactionTable: ({ rows }: { rows: Array<{ id: string }> }) => <p>{rows.map((row) => row.id).join(',')}</p>,
}))

import { MonthlyTransactionList } from './monthly-transaction-list'

describe('MonthlyTransactionList', () => {
  it('renders filter controls as buttons instead of navigation links', () => {
    const html = renderToStaticMarkup(
      <MonthlyTransactionList
        dictionary={dictionaries['zh-TW']}
        language="zh-TW"
        rows={[
          { id: 'reviewed', user_reviewed_at: '2026-09-12T00:00:00Z' },
          { id: 'unreviewed', user_reviewed_at: null },
        ] as never}
      />,
    )

    expect(html).toContain('<button')
    expect(html).toContain('全部交易')
    expect(html).toContain('未看過')
    expect(html).not.toContain('href=')
  })
})
