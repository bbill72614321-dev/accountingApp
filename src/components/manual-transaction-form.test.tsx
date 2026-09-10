import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ManualTransactionForm } from './manual-transaction-form'
import { dictionaries } from '@/lib/i18n'

describe('ManualTransactionForm', () => {
  it('provides a cancel link back to transactions', () => {
    const html = renderToStaticMarkup(
      <ManualTransactionForm
        action={async () => ({ status: 'idle', message: '' })}
        labels={dictionaries['zh-TW']}
      />,
    )

    expect(html).toContain('href="/transactions"')
    expect(html).toContain('取消')
  })
})
