import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { dictionaries } from '@/lib/i18n'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/actions/transactions', () => ({ saveTransactionSplit: vi.fn() }))

import { SplitPaymentDialog } from './split-payment-dialog'

describe('split removal control', () => {
  it('offers unsplit only when a saved split exists', () => {
    const props = { amountCents: -12000, dictionary: dictionaries.en, transactionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
    const split = { split_count: 2, personal_amount_cents: 6000 }
    const html = renderToStaticMarkup(<SplitPaymentDialog {...props} split={split} />)
    expect(html.split('<dialog')[0]).toMatch(/<button[^>]*>Unsplit<\/button>/)
    expect(html.split('<dialog')[1]).not.toContain('>Unsplit</button>')
    expect(renderToStaticMarkup(<SplitPaymentDialog {...props} />)).not.toContain('>Unsplit</button>')
  })
})
