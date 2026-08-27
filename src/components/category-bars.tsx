import Link from 'next/link'
import { CATEGORY_LABELS, CATEGORIES, type Language } from '@/features/transactions/categories'
import { formatUsd } from '@/features/transactions/money'
import type { MonthlySummary } from '@/features/transactions/monthly-summary'
import type { Dictionary } from '@/lib/i18n'

export function CategoryBars({ summary, language, dictionary, month }: {
  summary: MonthlySummary
  language: Language
  dictionary: Dictionary
  month: string
}) {
  const categories = CATEGORIES.map((category) => ({
    category, value: summary.categorySpending[category], label: CATEGORY_LABELS[category][language],
  })).filter(({ value }) => value > 0)
  const max = Math.max(...categories.map(({ value }) => value), 0)

  if (categories.length === 0) return <p>{dictionary.noCategorySpending}</p>

  return (
    <ul className="category-bars">
      {categories.map(({ category, value, label }) => {
        const percentage = summary.totalSpendingCents === 0
          ? '0.0'
          : (value / summary.totalSpendingCents * 100).toFixed(1)
        return (
          <li key={category}>
            <div className="category-bar-label">
              <Link href={`/transactions?month=${month}&category=${encodeURIComponent(category)}`}>{label}</Link>
              <span>{formatUsd(value, language)} · {percentage}%</span>
            </div>
            <div className="category-bar-track" aria-label={`${label}: ${formatUsd(value, language)}`}>
              <div className="category-bar-fill" style={{ width: `${Math.max(2, value / max * 100)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
