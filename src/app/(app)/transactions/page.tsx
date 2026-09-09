import Link from 'next/link'
import { z } from 'zod'
import { MonthNavigator } from '@/components/month-navigator'
import { TransactionTable, type TransactionRow } from '@/components/transaction-table'
import { CATEGORIES, CATEGORY_LABELS } from '@/features/transactions/categories'
import { effectiveCategoryFilter } from '@/features/transactions/merchant-rule'
import { compareTransactionDisplayOrder } from '@/features/transactions/display-order'
import { availableMonths } from '@/features/transactions/month-navigation'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { hasTransactionFilters } from '@/lib/ui-state'

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

export default async function TransactionsPage({
  searchParams,
}: { searchParams: Promise<{ month?: string; category?: string }> }) {
  const { month: rawMonth, category: rawCategory } = await searchParams
  const month = monthSchema.safeParse(rawMonth).data
  const category = z.enum(CATEGORIES).safeParse(rawCategory).data
  const homeMonth = new Date().toISOString().slice(0, 7)
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  let query = supabase.from('transactions').select(
    'id, created_at, source, raw_description, source_category, category_override, transaction_date, amount_cents, note, pending, provider_pending, review_status, include_in_report, excluded_from_report, bank_account:bank_accounts(name, mask), transaction_split:transaction_splits(split_count, personal_amount_cents, requested_at)',
  ).eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false })

  if (month) query = query.gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
  if (category) query = query.or(effectiveCategoryFilter(category))

  const { data, error } = await query
  if (error) throw new Error('Unable to load transactions')
  const { data: monthRows, error: monthError } = await supabase.from('transactions').select('transaction_date').eq('user_id', user.id)
  if (monthError) throw new Error('Unable to load available months')
  const months = availableMonths((monthRows ?? []).map((row) => row.transaction_date), homeMonth)
  const rows = (data ?? []).map((row) => ({
    ...row,
    bank_account: Array.isArray(row.bank_account) ? row.bank_account[0] ?? null : row.bank_account,
    transaction_split: Array.isArray(row.transaction_split) ? row.transaction_split[0] ?? null : row.transaction_split,
  })).toSorted((left, right) => compareTransactionDisplayOrder({
    id: left.id, transactionDate: left.transaction_date, createdAt: left.created_at,
  }, {
    id: right.id, transactionDate: right.transaction_date, createdAt: right.created_at,
  })) as TransactionRow[]
  const hasFilters = hasTransactionFilters({ month, category })

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
      <div className="transaction-filter-row">
        <MonthNavigator currentMonth={month ?? homeMonth} homeMonth={homeMonth} labels={{ current: dictionary.currentMonth, month: dictionary.month, previous: dictionary.previousMonth, next: dictionary.nextMonth }} language={language} months={months} path="/transactions" query={category ? { category } : {}} />
        <form className="category-filter" method="get">
          {month && <input name="month" type="hidden" value={month} />}
          <div className="category-filter-field">
            <label htmlFor="filter-category">{dictionary.category}</label>
            <select defaultValue={category ?? ''} id="filter-category" name="category">
              <option value="">—</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>)}
            </select>
          </div>
        <button className="button" type="submit">{dictionary.filters}</button>
        {hasFilters && <Link className="button" href="/transactions">{dictionary.clearFilters}</Link>}
        </form>
      </div>
      {rows.length === 0 ? <p className="ledger-empty">{hasFilters ? dictionary.noFilteredTransactions : dictionary.noTransactions}</p> : <TransactionTable dictionary={dictionary} language={language} rows={rows} />}
    </section>
  )
}
