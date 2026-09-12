'use client'

import { useState } from 'react'
import { TransactionTable, type TransactionRow } from '@/components/transaction-table'
import { filterReportRowsByReview, type ReviewFilter } from '@/features/transactions/review-filter'
import type { Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

export function MonthlyTransactionList({ dictionary, language, rows }: {
  dictionary: Dictionary
  language: Language
  rows: TransactionRow[]
}) {
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const visibleRows = filterReportRowsByReview(rows, filter)

  return (
    <>
      <nav aria-label={dictionary.transactions} className="report-row-filter">
        <button className={filter === 'all' ? 'is-active' : undefined} onClick={() => setFilter('all')} type="button">{dictionary.allTransactions}</button>
        <button className={filter === 'unreviewed' ? 'is-active' : undefined} onClick={() => setFilter('unreviewed')} type="button">{dictionary.unreviewedTransactions}</button>
      </nav>
      {visibleRows.length === 0 ? <p className="muted">{dictionary.noTransactions}</p> : <TransactionTable dictionary={dictionary} language={language} rows={visibleRows} />}
    </>
  )
}
