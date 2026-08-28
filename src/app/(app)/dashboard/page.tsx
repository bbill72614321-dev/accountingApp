import Link from 'next/link'
import { z } from 'zod'
import { CategoryBars } from '@/components/category-bars'
import type { Category } from '@/features/transactions/categories'
import { summarizeMonth, type SummaryTransaction } from '@/features/transactions/monthly-summary'
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
    'transaction_date, amount_cents, source_category, category_override, pending, include_in_report',
  ).eq('user_id', user.id).eq('include_in_report', true)
    .gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
  if (error) throw new Error('Unable to load monthly summary')

  const transactions: SummaryTransaction[] = (data ?? []).map((row) => ({
    date: row.transaction_date,
    amountCents: row.amount_cents,
    category: (row.category_override ?? row.source_category) as Category | null,
    pending: row.pending,
    includeInReport: row.include_in_report,
  }))
  const summary = summarizeMonth(transactions, month as `${number}-${string}`)

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <h1>{dictionary.dashboard}</h1>
          <p className="muted">{month}</p>
        </div>
        <div className="report-actions">
          <Link className="button" href={`/reports/monthly?month=${month}`}>{dictionary.savePdf}</Link>
          <a className="button" href={`/api/reports/monthly.xlsx?month=${month}`}>{dictionary.downloadExcel}</a>
          <Link className="button button-primary" href="/transactions/new">{dictionary.newTransaction}</Link>
        </div>
      </div>
      <form className="filters" method="get">
        <label htmlFor="dashboard-month">{dictionary.month}</label>
        <input defaultValue={month} id="dashboard-month" name="month" pattern="\d{4}-\d{2}" placeholder="YYYY-MM" />
        <button className="button" type="submit">{dictionary.filters}</button>
      </form>
      <div className="summary-cards">
        <section className="summary-card">
          <h2>{dictionary.totalSpending}</h2>
          <p data-testid="total-spending">{formatUsd(summary.totalSpendingCents, language)}</p>
        </section>
        <section className="summary-card">
          <h2>{dictionary.netAmount}</h2>
          <p data-testid="net-amount">{formatUsd(summary.netAmountCents, language)}</p>
        </section>
      </div>
      <section className="category-summary">
        <div className="section-heading">
          <h2>{dictionary.category}</h2>
          <Link href={`/transactions?month=${month}`}>{dictionary.transactions}</Link>
        </div>
        <CategoryBars dictionary={dictionary} language={language} month={month} summary={summary} />
      </section>
      <p className="muted">{dictionary.syncLater}</p>
    </div>
  )
}
