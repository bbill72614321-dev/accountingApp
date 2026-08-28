import { z } from 'zod'
import { PrintReportButton } from '@/components/print-report-button'
import { CATEGORY_LABELS, type Category } from '@/features/transactions/categories'
import { buildMonthlyExportData, type MonthlyExportTransaction } from '@/features/transactions/monthly-export'
import { formatUsd } from '@/features/transactions/money'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/)

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

export default async function PrintableMonthlyReport({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = monthSchema.safeParse((await searchParams).month).data
  if (!month) throw new Error('Invalid month')
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').select(
    'raw_description, note, transaction_date, amount_cents, source_category, category_override, pending, include_in_report',
  ).eq('user_id', user.id).eq('include_in_report', true)
    .gte('transaction_date', `${month}-01`).lt('transaction_date', `${nextMonth(month)}-01`)
  if (error) throw new Error('Unable to load report')

  const transactions: MonthlyExportTransaction[] = (data ?? []).map((row) => ({
    merchant: row.raw_description ?? '', note: row.note ?? '', date: row.transaction_date,
    amountCents: row.amount_cents, category: (row.category_override ?? row.source_category) as Category | null,
    pending: row.pending, includeInReport: row.include_in_report,
  }))
  const report = buildMonthlyExportData({ language, month: month as `${number}-${string}`, transactions })

  return (
    <main className="print-report">
      <div className="page-heading no-print">
        <h1>{dictionary.monthlySummary}</h1>
        <PrintReportButton label={dictionary.savePdf} />
      </div>
      <h1>{dictionary.monthlySummary}: {month}</h1>
      <dl className="summary-cards">
        <div className="summary-card"><dt>{dictionary.totalSpending}</dt><dd>{formatUsd(report.summary.totalSpendingCents, language)}</dd></div>
        <div className="summary-card"><dt>{dictionary.netAmount}</dt><dd>{formatUsd(report.summary.netAmountCents, language)}</dd></div>
      </dl>
      <h2>{dictionary.categorySummary}</h2>
      <table><thead><tr><th>{dictionary.category}</th><th>{dictionary.totalSpending}</th></tr></thead><tbody>
        {report.categoryRows.map(({ category, amountCents }) => <tr key={category}><td>{CATEGORY_LABELS[category][language]}</td><td>{formatUsd(amountCents, language)}</td></tr>)}
      </tbody></table>
      <h2>{dictionary.transactionDetails}</h2>
      <table><thead><tr><th>{dictionary.merchant}</th><th>{dictionary.category}</th><th>{dictionary.date}</th><th>{dictionary.amount}</th><th>{dictionary.note}</th></tr></thead><tbody>
        {report.transactionRows.map(([merchant, category, date, amountCents, note], index) => <tr key={`${date}-${index}`}><td>{merchant}</td><td>{category}</td><td>{date}</td><td>{formatUsd(amountCents, language)}</td><td>{note}</td></tr>)}
      </tbody></table>
    </main>
  )
}
