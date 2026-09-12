import { CATEGORIES, type Category } from './categories'

export type CategoryBreakdownRow = {
  category: Category | 'Uncategorized'
  valueCents: number
  percentage: number
}

export function buildCategoryBreakdown(
  categorySpending: Record<Category, number>,
  excludedCategory?: Category,
  uncategorizedSpendingCents = 0,
) {
  const includedRows: Array<{ category: Category | 'Uncategorized'; valueCents: number }> = CATEGORIES
    .filter((category) => category !== excludedCategory && categorySpending[category] > 0)
    .map((category) => ({ category, valueCents: categorySpending[category] }))

  if (uncategorizedSpendingCents > 0) {
    includedRows.push({ category: 'Uncategorized', valueCents: uncategorizedSpendingCents })
  }

  includedRows
    .sort((left, right) => right.valueCents - left.valueCents)
  const totalCents = includedRows.reduce((total, row) => total + row.valueCents, 0)
  const rows: CategoryBreakdownRow[] = includedRows.map((row) => ({
    ...row,
    percentage: totalCents === 0 ? 0 : Number((row.valueCents / totalCents * 100).toFixed(1)),
  }))

  return { totalCents, rows }
}
