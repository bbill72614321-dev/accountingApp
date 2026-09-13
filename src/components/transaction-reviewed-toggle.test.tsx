import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { dictionaries } from '@/lib/i18n'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/actions/transactions', () => ({ setTransactionReviewed: vi.fn() }))

import { TransactionReviewedToggle } from './transaction-reviewed-toggle'

describe('TransactionReviewedToggle', () => {
  it('renders an accessible checkbox without visible reviewed text', () => {
    const html = renderToStaticMarkup(
      <TransactionReviewedToggle dictionary={dictionaries['zh-TW']} reviewedAt={null} transactionId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />,
    )

    expect(html).toContain('type="checkbox"')
    expect(html).toContain('aria-label="標記已審核"')
    expect(html).not.toContain('已看過')
  })
})
