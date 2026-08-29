import { CATEGORIES, type Category } from './categories'

export type SummaryTransaction = {
  date: string
  amountCents: number
  category: Category | null
  pending: boolean
  includeInReport: boolean
  providerPending?: boolean
  reviewStatus?: 'confirmed' | 'needs_review'
  currency?: string | null
}

export type ReportEligibility = {
  includeInReport: boolean
  providerPending: boolean
  reviewStatus: 'confirmed' | 'needs_review'
  currency: string | null
}

export function isReportEligible(transaction: ReportEligibility) {
  return transaction.includeInReport
    && !transaction.providerPending
    && transaction.reviewStatus === 'confirmed'
    && transaction.currency === 'USD'
}

export type MonthlySummary = {
  totalSpendingCents: number
  netAmountCents: number
  categorySpending: Record<Category, number>
}

export function summarizeMonth(
  transactions: readonly SummaryTransaction[],
  month: `${number}-${string}`,
): MonthlySummary {
  const categorySpending = Object.fromEntries(CATEGORIES.map((name) => [name, 0])) as Record<Category, number>
  let netAmountCents = 0

  for (const transaction of transactions) {
    if (!transaction.date.startsWith(`${month}-`) || !isReportEligible({
      includeInReport: transaction.includeInReport,
      providerPending: transaction.providerPending ?? transaction.pending,
      reviewStatus: transaction.reviewStatus ?? 'confirmed',
      currency: transaction.currency ?? 'USD',
    })) continue
    netAmountCents += transaction.amountCents
    if (transaction.category) categorySpending[transaction.category] -= transaction.amountCents
  }

  const totalSpendingCents = Math.max(0, Object.values(categorySpending).reduce((sum, value) => sum + value, 0))
  return { totalSpendingCents, netAmountCents, categorySpending }
}

export function countPendingMonth(
  transactions: readonly SummaryTransaction[],
  month: `${number}-${string}`,
) {
  return transactions.filter((transaction) => transaction.pending && transaction.date.startsWith(`${month}-`)).length
}
