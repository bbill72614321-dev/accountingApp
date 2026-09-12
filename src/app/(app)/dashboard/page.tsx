import Link from 'next/link'
import { z } from 'zod'
import { CategoryBars } from '@/components/category-bars'
import { MonthNavigator } from '@/components/month-navigator'
import { TransactionTable, type TransactionRow } from '@/components/transaction-table'
import type { Category } from '@/features/transactions/categories'
import { availableMonths } from '@/features/transactions/month-navigation'
import { countPendingMonth, isReportEligible, summarizeMonth, type SummaryTransaction } from '@/features/transactions/monthly-summary'
import { formatUsd } from '@/features/transactions/money'
import { effectiveReportAmountCents } from '@/features/transactions/split-payment'
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
  const homeMonth = new Date().toISOString().slice(0, 7)
  const month = monthSchema.safeParse(rawMonth).data ?? homeMonth
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const user = await requireUser()
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').select(
    'id, created_at, source, raw_description, transaction_date, amount_cents, note, source_category, category_override, pending, provider_pending, review_status, user_reviewed_at, include_in_report, excluded_from_report, bank_account:bank_accounts(name, mask), transaction_split:transaction_splits(split_count, personal_amount_cents, requested_at)',
  ).eq('user_id', user.id).gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
    .order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load monthly summary')
  const { data: monthRows, error: monthError } = await supabase.from('transactions').select('transaction_date').eq('user_id', user.id)
  if (monthError) throw new Error('Unable to load available months')
  const months = availableMonths((monthRows ?? []).map((row) => row.transaction_date), homeMonth)

  const reportRows = (data ?? []).map((row) => {
    const transactionSplit = Array.isArray(row.transaction_split) ? row.transaction_split[0] : row.transaction_split
    return { ...row, report_amount_cents: effectiveReportAmountCents(row.amount_cents, transactionSplit?.personal_amount_cents ?? null) }
  })
  const transactions: SummaryTransaction[] = reportRows.map((row) => ({
    date: row.transaction_date,
    amountCents: row.report_amount_cents,
    category: (row.category_override ?? row.source_category) as Category | null,
    pending: row.pending,
    providerPending: row.provider_pending,
    reviewStatus: row.review_status,
    includeInReport: row.include_in_report,
  }))
  const summary = summarizeMonth(transactions, month as `${number}-${string}`)
  const pendingCount = countPendingMonth(transactions, month as `${number}-${string}`)
  const recentRows = reportRows.filter((row) => isReportEligible({
    includeInReport: row.include_in_report,
    providerPending: row.provider_pending,
    reviewStatus: row.review_status,
    currency: 'USD',
  })).map((row) => ({
    ...row,
    bank_account: Array.isArray(row.bank_account) ? row.bank_account[0] ?? null : row.bank_account,
    transaction_split: Array.isArray(row.transaction_split) ? row.transaction_split[0] ?? null : row.transaction_split,
  })) as TransactionRow[]

  return (
    <div className="console-page dashboard-page">
      <div className="page-heading">
        <div>
          <h1>{dictionary.dashboard}</h1>
          <p className="muted">{month} · {data?.length ?? 0} {dictionary.results}</p>
        </div>
        <div className="report-actions">
          <Link className="button" href={`/reports/monthly?month=${month}`}>{dictionary.savePdf}</Link>
          <a className="button" href={`/api/reports/monthly.xlsx?month=${month}`}>{dictionary.downloadExcel}</a>
          <Link className="button button-primary" href="/transactions/new">+ {dictionary.newTransaction}</Link>
        </div>
      </div>
      <MonthNavigator currentMonth={month} homeMonth={homeMonth} labels={{ current: dictionary.currentMonth, month: dictionary.month, previous: dictionary.previousMonth, next: dictionary.nextMonth }} language={language} months={months} />
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
          <h2>{dictionary.bankPending}</h2>
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
        {recentRows.length === 0 ? <p className="muted">{dictionary.noTransactions}</p> : <TransactionTable dictionary={dictionary} language={language} rows={recentRows} />}
      </section>
    </div>
  )
}
