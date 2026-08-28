import Link from 'next/link'
import { z } from 'zod'
import { TransactionTable, type TransactionRow } from '@/components/transaction-table'
import { CATEGORIES, CATEGORY_LABELS } from '@/features/transactions/categories'
import { effectiveCategoryFilter } from '@/features/transactions/merchant-rule'
import { formatUsd } from '@/features/transactions/money'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { hasTransactionFilters, isPendingFilter } from '@/lib/ui-state'

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const searchSchema = z.string().trim().min(1).max(200).regex(/^[\p{L}\p{N}\s.'’-]+$/u)

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

export default async function TransactionsPage({
  searchParams,
}: { searchParams: Promise<{ month?: string; category?: string; q?: string; review?: string }> }) {
  const { month: rawMonth, category: rawCategory, q: rawSearch, review: rawReview } = await searchParams
  const month = monthSchema.safeParse(rawMonth).data
  const category = z.enum(CATEGORIES).safeParse(rawCategory).data
  const search = searchSchema.safeParse(rawSearch).data
  const review = isPendingFilter(rawReview) ? 'pending' : undefined
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  let query = supabase.from('transactions').select(
    'id, source, raw_description, source_category, category_override, transaction_date, amount_cents, note, pending, include_in_report',
  ).eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false })

  if (month) query = query.gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
  if (category) query = query.or(effectiveCategoryFilter(category))
  if (search) query = query.or(`raw_description.ilike.*${search}*,note.ilike.*${search}*`)
  if (review) query = query.eq('pending', true)

  const { data, error } = await query
  if (error) throw new Error('Unable to load transactions')
  const rows = (data ?? []) as TransactionRow[]
  const outgoingCents = rows.reduce((total, row) => total + Math.max(0, -row.amount_cents), 0)
  const netCents = rows.reduce((total, row) => total + row.amount_cents, 0)
  const pendingCount = rows.filter((row) => row.pending).length
  const hasFilters = hasTransactionFilters({ month, category, q: search, review })

  return (
    <section className="console-page ledger-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEDGER / ACTIVITY</span>
          <h1>{dictionary.transactions}</h1>
          <p className="muted">{rows.length} {dictionary.results}</p>
        </div>
        <Link className="button button-primary" href="/transactions/new">+ {dictionary.newTransaction}</Link>
      </div>
      <form className="filters" method="get">
        <label htmlFor="month">{dictionary.month}</label>
        <input defaultValue={month} id="month" name="month" pattern="\d{4}-(0[1-9]|1[0-2])" placeholder="YYYY-MM" />
        <label htmlFor="filter-category">{dictionary.category}</label>
        <select defaultValue={category ?? ''} id="filter-category" name="category">
          <option value="">—</option>
          {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>)}
        </select>
        <label htmlFor="q">{dictionary.search}</label>
        <input defaultValue={search} id="q" name="q" />
        <label htmlFor="review">{dictionary.needsReview}</label>
        <select defaultValue={review ?? ''} id="review" name="review">
          <option value="">—</option>
          <option value="pending">{dictionary.needsReview}</option>
        </select>
        <button type="submit">{dictionary.filters}</button>
        {hasFilters && <Link className="button" href="/transactions">{dictionary.clearFilters}</Link>}
      </form>
      <div className="ledger-summary-strip">
        <div><span>{dictionary.totalSpending}</span><strong>{formatUsd(outgoingCents, language)}</strong></div>
        <div><span>{dictionary.netAmount}</span><strong>{formatUsd(netCents, language)}</strong></div>
        <Link href={`/transactions${month ? `?month=${month}&review=pending` : '?review=pending'}`}><span>{dictionary.needsReview}</span><strong>{pendingCount}</strong></Link>
      </div>
      {rows.length === 0 ? <p className="ledger-empty">{hasFilters ? dictionary.noFilteredTransactions : dictionary.noTransactions}</p> : <TransactionTable dictionary={dictionary} language={language} rows={rows} />}
    </section>
  )
}
