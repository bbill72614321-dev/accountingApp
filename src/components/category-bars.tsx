import Link from 'next/link'
import { CATEGORY_LABELS, type Language } from '@/features/transactions/categories'
import { buildCategoryBreakdown, type CategoryBreakdownRow } from '@/features/transactions/category-breakdown'
import { formatUsd } from '@/features/transactions/money'
import type { MonthlySummary } from '@/features/transactions/monthly-summary'
import type { Dictionary } from '@/lib/i18n'

const CATEGORY_COLORS = {
  Travel: 'var(--chart-travel)',
  Grocery: 'var(--chart-grocery)',
  Shopping: 'var(--chart-shopping)',
  Car: 'var(--chart-car)',
  'Dine Out': 'var(--chart-dine-out)',
  Utility: 'var(--chart-utility)',
  Entertainment: 'var(--chart-entertainment)',
  Learning: 'var(--chart-learning)',
  Home: 'var(--chart-home)',
  Cat: 'var(--chart-cat)',
  Other: 'var(--chart-other)',
} as const

function pieBackground(rows: CategoryBreakdownRow[], totalCents: number) {
  let start = 0
  const stops = rows.map((row) => {
    const end = start + row.valueCents / totalCents * 100
    const stop = `${CATEGORY_COLORS[row.category]} ${start}% ${end}%`
    start = end
    return stop
  })
  return `conic-gradient(${stops.join(', ')})`
}

function CategoryChart({
  title,
  rows,
  totalCents,
  language,
  dictionary,
  month,
}: {
  title: string
  rows: CategoryBreakdownRow[]
  totalCents: number
  language: Language
  dictionary: Dictionary
  month: string
}) {
  if (rows.length === 0) return (
    <section className="category-chart">
      <h3>{title}</h3>
      <p className="muted">{dictionary.noCategorySpending}</p>
    </section>
  )

  return (
    <section className="category-chart" aria-labelledby={`category-chart-${title}`}>
      <h3 id={`category-chart-${title}`}>{title}</h3>
      <div className="category-chart-body">
        <div className="category-pie" role="img" aria-label={`${title}: ${formatUsd(totalCents, language)}`} style={{ background: pieBackground(rows, totalCents) }}>
          <span>{formatUsd(totalCents, language)}</span>
        </div>
        <ul className="category-pie-legend">
          {rows.map(({ category, valueCents, percentage }) => (
            <li key={category}>
              <span className="category-swatch" style={{ backgroundColor: CATEGORY_COLORS[category] }} aria-hidden="true" />
              <Link href={`/transactions?month=${month}&category=${encodeURIComponent(category)}`}>
                {CATEGORY_LABELS[category][language]}
              </Link>
              <span>{formatUsd(valueCents, language)} · {percentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CategoryBars({ summary, language, dictionary, month }: {
  summary: MonthlySummary
  language: Language
  dictionary: Dictionary
  month: string
}) {
  const fullBreakdown = buildCategoryBreakdown(summary.categorySpending)
  const withoutHomeBreakdown = buildCategoryBreakdown(summary.categorySpending, 'Home')

  return (
    <div className="category-chart-grid">
      <CategoryChart title={dictionary.allCategories} rows={fullBreakdown.rows} totalCents={fullBreakdown.totalCents} language={language} dictionary={dictionary} month={month} />
      <CategoryChart title={dictionary.withoutHome} rows={withoutHomeBreakdown.rows} totalCents={withoutHomeBreakdown.totalCents} language={language} dictionary={dictionary} month={month} />
    </div>
  )
}
