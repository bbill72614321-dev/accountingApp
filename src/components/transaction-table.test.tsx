import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('./split-payment-dialog', () => ({
  SplitPaymentDialog: () => <button type="button">Split</button>,
}))
vi.mock('./transaction-category-select', () => ({
  TransactionCategorySelect: () => <span data-auto-category="true">請選擇分類</span>,
}))
vi.mock('./transaction-reviewed-toggle', () => ({
  TransactionReviewedToggle: () => <span>已看過</span>,
}))
import { TransactionTable } from './transaction-table'
import { dictionaries } from '@/lib/i18n'

describe('TransactionTable', () => {
  it('shows an automatic category control, personal review marker, and skip action without a category save button', () => {
    const html = renderToStaticMarkup(
      <TransactionTable
        dictionary={dictionaries['zh-TW']}
        language="zh-TW"
        rows={[{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', raw_description: 'Safeway',
          source_category: null, category_override: null, transaction_date: '2026-09-12',
          amount_cents: -1250, note: '', include_in_report: true, excluded_from_report: false,
          source: 'plaid', pending: false, provider_pending: false, review_status: 'needs_review',
        }]}
      />,
    )

    expect(html).toContain('請選擇分類')
    expect(html).toContain('已看過')
    expect(html).toContain('略過')
    expect(html).toContain('data-auto-category="true"')
  })
})
