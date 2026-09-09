'use client'

import { useRouter } from 'next/navigation'
import { adjacentMonth } from '@/features/transactions/month-navigation'
import type { Language } from '@/features/transactions/categories'

function monthLabel(month: string, language: Language) {
  return new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC', year: 'numeric' })
    .format(new Date(`${month}-01T00:00:00Z`))
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
}

export function MonthNavigator({ currentMonth, homeMonth, language, months, labels }: {
  currentMonth: string
  homeMonth: string
  language: Language
  months: string[]
  labels: { current: string; month: string; newer: string; older: string }
}) {
  const router = useRouter()
  const navigate = (month: string) => router.push(month === homeMonth ? '/dashboard' : `/dashboard?month=${month}`)
  const newer = adjacentMonth(months, currentMonth, 'newer')
  const older = adjacentMonth(months, currentMonth, 'older')

  return <nav aria-label={labels.month} className="month-navigator">
    <button aria-label={labels.newer} className="month-nav-arrow" disabled={!newer} onClick={() => newer && navigate(newer)} type="button"><ArrowIcon direction="left" /></button>
    <select aria-label={labels.month} onChange={(event) => navigate(event.target.value)} value={currentMonth}>
      {months.map((month) => <option key={month} value={month}>{monthLabel(month, language)}</option>)}
    </select>
    <button aria-label={labels.older} className="month-nav-arrow" disabled={!older} onClick={() => older && navigate(older)} type="button"><ArrowIcon direction="right" /></button>
    <button className="month-nav-current" disabled={currentMonth === homeMonth} onClick={() => navigate(homeMonth)} type="button">{labels.current}</button>
  </nav>
}
