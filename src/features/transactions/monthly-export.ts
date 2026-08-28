import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from './categories'
import { summarizeMonth, type SummaryTransaction } from './monthly-summary'

export type MonthlyExportTransaction = SummaryTransaction & {
  merchant: string
  note: string
}

export type MonthlyExportRow = [merchant: string, category: string, date: string, amountCents: number, note: string]

export function buildMonthlyExportData({
  language, month, transactions,
}: {
  language: Language
  month: `${number}-${string}`
  transactions: readonly MonthlyExportTransaction[]
}) {
  const summary = summarizeMonth(transactions, month)
  const transactionRows = transactions
    .filter((transaction) => transaction.date.startsWith(`${month}-`) && !transaction.pending && transaction.includeInReport)
    .map((transaction): MonthlyExportRow => [
      transaction.merchant,
      transaction.category ? CATEGORY_LABELS[transaction.category][language] : language === 'en' ? 'Income / no spending category' : '收入／不列支出分類',
      transaction.date,
      transaction.amountCents,
      transaction.note,
    ])

  const categoryRows = CATEGORIES.flatMap((category: Category) => {
    const amountCents = summary.categorySpending[category]
    return amountCents > 0 ? [{ category, amountCents }] : []
  })

  return { summary, categoryRows, transactionRows }
}
