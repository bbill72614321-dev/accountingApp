'use client'

import { useState, type ReactNode } from 'react'
import { TransactionTable, type TransactionRow } from './transaction-table'
import { searchTransactions, searchSpending } from '@/features/transactions/search'
import { formatUsd } from '@/features/transactions/money'
import type { Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

export function SearchableTransactionList({ rows, language, dictionary, children }: {
  rows: TransactionRow[]; language: Language; dictionary: Dictionary; children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const visibleRows = searchTransactions(rows, query)
  const spending = searchSpending(visibleRows)
  return (
    <>
      <div className="transaction-filter-row">
        {children}
        <label className="transaction-search">
          <span>{dictionary.search}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dictionary.searchMerchantNotes} />
        </label>
      </div>
      <div className="transaction-search-summary" aria-live="polite">
        <span>{visibleRows.length} {dictionary.results}</span>
        {query.trim() && <>
          <span>{dictionary.searchOriginalSpending}: {formatUsd(spending.original, language)}</span>
          {spending.hasSplit && <span>{dictionary.yourShare}: {formatUsd(spending.personal, language)}</span>}
          <small>{dictionary.searchTotalsHint}</small>
        </>}
      </div>
      {visibleRows.length === 0 ? <p className="ledger-empty">{dictionary.noFilteredTransactions}</p> : <TransactionTable dictionary={dictionary} language={language} rows={visibleRows} />}
    </>
  )
}
