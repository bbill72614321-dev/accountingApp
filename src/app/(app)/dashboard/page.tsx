import Link from 'next/link'
import { z } from 'zod'
import { CategoryBars } from '@/components/category-bars'
import type { Category } from '@/features/transactions/categories'
import { countPendingMonth, summarizeMonth, type SummaryTransaction } from '@/features/transactions/monthly-summary'
import { formatUsd } from '@/features/transactions/money'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/)

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ month?: string }> }) {
  const { month: rawMonth } = await searchParams
  const month = monthSchema.safeParse(rawMonth).data ?? new Date().toISOString().slice(0, 7)
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const user = await requireUser()
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').select(
    'raw_description, transaction_date, amount_cents, source_category, category_override, pending, provider_pending, review_status, include_in_report',
  ).eq('user_id', user.id).gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
    .order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load monthly summary')

  const transactions: SummaryTransaction[] = (data ?? []).map((row) => ({
    date: row.transaction_date,
    amountCents: row.amount_cents,
    category: (row.category_override ?? row.source_category) as Category | null,
    pending: row.pending,
    providerPending: row.provider_pending,
    reviewStatus: row.review_status,
    includeInReport: row.include_in_report,
  }))
  const summary = summarizeMonth(transactions, month as `${number}-${string}`)
  const pendingCount = countPendingMonth(transactions, month as `${number}-${string}`)
  const recentRows = (data ?? []).slice(0, 5)

  return (
    <div className="console-page dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEDGER / MONTHLY SIGNAL</span>
          <h1>{dictionary.dashboard}</h1>
          <p className="muted">{month} · {data?.length ?? 0} {dictionary.results}</p>
        </div>
        <div className="report-actions">
          <Link className="button" href={`/reports/monthly?month=${month}`}>{dictionary.savePdf}</Link>
          <a className="button" href={`/api/reports/monthly.xlsx?month=${month}`}>{dictionary.downloadExcel}</a>
          <Link className="button button-primary" href="/transactions/new">+ {dictionary.newTransaction}</Link>
        </div>
      </div>
      <form className="filters" method="get">
        <label htmlFor="dashboard-month">{dictionary.month}</label>
        <input defaultValue={month} id="dashboard-month" name="month" pattern="\d{4}-\d{2}" placeholder="YYYY-MM" />
        <button className="button" type="submit">{dictionary.filters}</button>
      </form>
      <div className="console-metric-grid">
        <section className="primary-readout">
          <h2>{dictionary.spentThisMonth}</h2>
          <p data-testid="total-spending">{formatUsd(summary.totalSpendingCents, language)}</p>
          <span>{data?.length ?? 0} {dictionary.results}</span>
        </section>
        <section className="support-readout">
          <h2>{dictionary.netAmount}</h2>
          <p data-testid="net-amount">{formatUsd(summary.netAmountCents, language)}</p>
        </section>
        <Link className="support-readout review-readout" href={`/transactions?month=${month}&review=pending`}>
          <h2>{dictionary.needsReview}</h2>
          <p>{pendingCount}</p>
          <span>{dictionary.transactions}</span>
        </Link>
      </div>
      <section className="category-summary">
        <div className="section-heading">
          <h2>{dictionary.categorySummary}</h2>
          <Link href={`/transactions?month=${month}`}>{dictionary.transactions} →</Link>
        </div>
        <CategoryBars dictionary={dictionary} language={language} month={month} summary={summary} />
      </section>
      <section className="recent-activity console-panel">
        <div className="section-heading">
          <h2>{dictionary.transactions}</h2>
          <Link href={`/transactions?month=${month}`}>{dictionary.transactions} →</Link>
        </div>
        {recentRows.length === 0 ? <p className="muted">{dictionary.noTransactions}</p> : (
          <ul className="activity-list">
            {recentRows.map((row, index) => (
              <li key={`${row.transaction_date}-${index}`}>
                <div><strong>{row.raw_description || '—'}</strong><span>{row.transaction_date}</span></div>
                <span className={row.amount_cents < 0 ? 'amount-outgoing' : 'amount-incoming'}>
                  {`${row.amount_cents < 0 ? '−' : '+'}${formatUsd(Math.abs(row.amount_cents), language)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="muted">{dictionary.syncLater}</p>
    </div>
  )
}
