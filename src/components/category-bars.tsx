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

function categoryColor(category: CategoryBreakdownRow['category']) {
  return category === 'Uncategorized' ? 'var(--muted)' : CATEGORY_COLORS[category]
}

function categoryLabel(category: CategoryBreakdownRow['category'], language: Language, dictionary: Dictionary) {
  return category === 'Uncategorized' ? dictionary.uncategorized : CATEGORY_LABELS[category][language]
}

function piePoint(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 100 + radius * Math.cos(radians), y: 100 + radius * Math.sin(radians) }
}

function slicePath(start: number, end: number) {
  if (end - start >= 100) return 'M 100 0 A 100 100 0 1 1 99.99 0 Z'
  const from = piePoint(100, start / 100 * 360)
  const to = piePoint(100, end / 100 * 360)
  const largeArc = end - start > 50 ? 1 : 0
  return `M 100 100 L ${from.x} ${from.y} A 100 100 0 ${largeArc} 1 ${to.x} ${to.y} Z`
}

function CategoryPie({ rows, totalCents, language, dictionary, title }: {
  rows: CategoryBreakdownRow[]
  totalCents: number
  language: Language
  dictionary: Dictionary
  title: string
}) {
  const slices = rows.reduce<Array<CategoryBreakdownRow & { start: number; end: number }>>((items, row) => {
    const start = items.at(-1)?.end ?? 0
    const end = start + row.valueCents / totalCents * 100
    return [...items, { ...row, start, end }]
  }, [])

  return (
    <svg className="category-pie" viewBox="0 0 200 200" role="img" aria-label={`${title}: ${formatUsd(totalCents, language)}`}>
      <title>{`${title}: ${formatUsd(totalCents, language)}`}</title>
      {slices.map(({ category, percentage, start: sliceStart, end }) => {
        const middle = (sliceStart + end) / 2 / 100 * 360
        const labelPoint = piePoint(percentage >= 12 ? 58 : 74, middle)
        return (
          <g key={category}>
            <path d={slicePath(sliceStart, end)} fill={categoryColor(category)} />
            <text className="category-pie-label" x={labelPoint.x} y={labelPoint.y} textAnchor="middle">
              <tspan x={labelPoint.x} dy="-0.35em">{categoryLabel(category, language, dictionary)}</tspan>
              <tspan x={labelPoint.x} dy="1.2em">{percentage}%</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
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
        <CategoryPie rows={rows} totalCents={totalCents} language={language} dictionary={dictionary} title={title} />
        <ul className="category-pie-legend">
          {rows.map(({ category, valueCents, percentage }) => (
            <li key={category}>
              <span className="category-swatch" style={{ backgroundColor: categoryColor(category) }} aria-hidden="true" />
              <Link href={`/transactions?month=${month}&category=${encodeURIComponent(category)}`}>
                {categoryLabel(category, language, dictionary)}
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
  const fullBreakdown = buildCategoryBreakdown(summary.categorySpending, undefined, summary.uncategorizedSpendingCents)
  const withoutHomeBreakdown = buildCategoryBreakdown(summary.categorySpending, 'Home', summary.uncategorizedSpendingCents)

  return (
    <div className="category-chart-grid">
      <CategoryChart title={dictionary.allCategories} rows={fullBreakdown.rows} totalCents={fullBreakdown.totalCents} language={language} dictionary={dictionary} month={month} />
      <CategoryChart title={dictionary.withoutHome} rows={withoutHomeBreakdown.rows} totalCents={withoutHomeBreakdown.totalCents} language={language} dictionary={dictionary} month={month} />
    </div>
  )
}
