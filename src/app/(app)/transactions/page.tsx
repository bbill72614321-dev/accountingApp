import Link from 'next/link'
import { z } from 'zod'
import { TransactionTable, type TransactionRow } from '@/components/transaction-table'
import { CATEGORIES } from '@/features/transactions/categories'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const searchSchema = z.string().trim().min(1).max(200).regex(/^[\p{L}\p{N}\s.'’-]+$/u)

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

export default async function TransactionsPage({
  searchParams,
}: { searchParams: Promise<{ month?: string; category?: string; q?: string }> }) {
  const { month: rawMonth, category: rawCategory, q: rawSearch } = await searchParams
  const month = monthSchema.safeParse(rawMonth).data
  const category = z.enum(CATEGORIES).safeParse(rawCategory).data
  const search = searchSchema.safeParse(rawSearch).data
  const user = await requireUser()
  const supabase = await createServerClient()
  let query = supabase.from('transactions').select(
    'id, raw_description, source_category, category_override, transaction_date, amount_cents, note, include_in_report',
  ).eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false })

  if (month) query = query.gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
  if (category) query = query.or(`source_category.eq."${category}",category_override.eq."${category}"`)
  if (search) query = query.or(`raw_description.ilike.*${search}*,note.ilike.*${search}*`)

  const { data, error } = await query
  if (error) throw new Error('Unable to load transactions')
  const rows = (data ?? []) as TransactionRow[]

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Link href="/transactions/new">Add transaction</Link>
      </div>
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <label htmlFor="month">Month</label>
        <input defaultValue={month} id="month" name="month" pattern="\d{4}-(0[1-9]|1[0-2])" placeholder="YYYY-MM" />
        <label htmlFor="filter-category">Category</label>
        <select defaultValue={category ?? ''} id="filter-category" name="category">
          <option value="">All categories</option>
          {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label htmlFor="q">Search</label>
        <input defaultValue={search} id="q" name="q" />
        <button type="submit">Filter</button>
      </form>
      {rows.length === 0 ? <p>No transactions found.</p> : <TransactionTable rows={rows} />}
    </>
  )
}
