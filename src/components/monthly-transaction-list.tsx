'use client'

import { useState } from 'react'
import { TransactionTable, type TransactionRow } from '@/components/transaction-table'
import { filterReportRowsByReview, type ReviewFilter } from '@/features/transactions/review-filter'
import { searchTransactions } from '@/features/transactions/search'
import type { Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

export function MonthlyTransactionList({ dictionary, language, rows }: {
  dictionary: Dictionary
  language: Language
  rows: TransactionRow[]
}) {
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [query, setQuery] = useState('')
  const visibleRows = searchTransactions(filterReportRowsByReview(rows, filter), query)

  return (
    <>
      <div className="transaction-filter-row">
        <nav aria-label={dictionary.transactions} className="report-row-filter">
        <button className={filter === 'all' ? 'is-active' : undefined} onClick={() => setFilter('all')} type="button">{dictionary.allTransactions}</button>
        <button className={filter === 'unreviewed' ? 'is-active' : undefined} onClick={() => setFilter('unreviewed')} type="button">{dictionary.unreviewedTransactions}</button>
        </nav>
        <label className="transaction-search">
          <span>{dictionary.search}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dictionary.searchMerchantNotes} />
        </label>
      </div>
      <p className="muted" aria-live="polite">{visibleRows.length} {dictionary.results}</p>
      {visibleRows.length === 0 ? <p className="muted">{query.trim() ? dictionary.noFilteredTransactions : dictionary.noTransactions}</p> : <TransactionTable dictionary={dictionary} language={language} rows={visibleRows} />}
    </>
  )
}
