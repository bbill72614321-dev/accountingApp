import { z } from 'zod'
import { CATEGORY_LABELS, type Category } from '@/features/transactions/categories'
import { buildMonthlyExportData, type MonthlyExportTransaction } from '@/features/transactions/monthly-export'
import { createXlsx } from '@/features/transactions/xlsx'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/)

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

export async function GET(request: Request) {
  const month = monthSchema.safeParse(new URL(request.url).searchParams.get('month')).data
  if (!month) return new Response('Invalid month', { status: 400 })

  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').select(
    'raw_description, note, transaction_date, amount_cents, source_category, category_override, pending, provider_pending, review_status, include_in_report',
  ).eq('user_id', user.id).eq('include_in_report', true)
    .gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
  if (error) return new Response('Unable to load report', { status: 500 })

  const transactions: MonthlyExportTransaction[] = (data ?? []).map((row) => ({
    merchant: row.raw_description ?? '', note: row.note ?? '', date: row.transaction_date,
    amountCents: row.amount_cents, category: (row.category_override ?? row.source_category) as Category | null,
    pending: row.pending, includeInReport: row.include_in_report,
    providerPending: row.provider_pending, reviewStatus: row.review_status,
  }))
  const report = buildMonthlyExportData({ language, month: month as `${number}-${string}`, transactions })
  const workbook = createXlsx([
    { name: dictionary.monthlySummary, rows: [[dictionary.month, month], [dictionary.totalSpending, report.summary.totalSpendingCents / 100], [dictionary.netAmount, report.summary.netAmountCents / 100]] },
    { name: dictionary.categorySummary, rows: [[dictionary.category, dictionary.totalSpending], ...report.categoryRows.map(({ category, amountCents }) => [CATEGORY_LABELS[category][language], amountCents / 100])], },
    { name: dictionary.transactionDetails, rows: [[dictionary.merchant, dictionary.category, dictionary.date, dictionary.amount, dictionary.note], ...report.transactionRows.map(([merchant, category, date, amountCents, note]) => [merchant, category, date, amountCents / 100, note])], },
  ])

  return new Response(workbook, {
    headers: {
      'Content-Disposition': `attachment; filename="Monthly-Report-${month}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
