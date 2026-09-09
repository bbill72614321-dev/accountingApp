import { describe, expect, it } from 'vitest'
import {
  canEditTransaction,
  canDeleteTransaction,
  isCurrentNavigationPath,
  isPendingFilter,
  hasTransactionFilters,
  transactionSourceLabel,
  transactionStatus,
  transactionCategoryFieldKey,
  transactionReportDisposition,
} from './ui-state'

describe('UI state helpers', () => {
  it('marks the monthly summary as current only on its own path', () => {
    expect(isCurrentNavigationPath('/dashboard', '/dashboard')).toBe(true)
    expect(isCurrentNavigationPath('/dashboard', '/transactions')).toBe(false)
  })

  it('keeps Transactions active on its add and edit routes', () => {
    expect(isCurrentNavigationPath('/transactions/new', '/transactions')).toBe(true)
    expect(isCurrentNavigationPath('/transactions/abc/edit', '/transactions')).toBe(true)
  })

  it('allows deletion only for manual transactions', () => {
    expect(canDeleteTransaction('manual')).toBe(true)
    expect(canDeleteTransaction('plaid')).toBe(false)
  })

  it('allows full editing only for manual transactions', () => {
    expect(canEditTransaction('manual')).toBe(true)
    expect(canEditTransaction('plaid')).toBe(false)
  })

  it('changes a category field key after its saved category changes', () => {
    expect(transactionCategoryFieldKey('transaction-1', null)).not.toBe(transactionCategoryFieldKey('transaction-1', 'Grocery'))
  })

  it('labels pending entries as needing review', () => {
    expect(transactionStatus(true)).toBe('needsReview')
    expect(transactionStatus(false)).toBe('ready')
  })

  it('only treats the pending query value as the review filter', () => {
    expect(isPendingFilter('pending')).toBe(true)
    expect(isPendingFilter('all')).toBe(false)
    expect(isPendingFilter(undefined)).toBe(false)
  })

  it('labels only manual transactions as manual', () => {
    expect(transactionSourceLabel('manual')).toBe('manual')
    expect(transactionSourceLabel('plaid')).toBe('imported')
  })

  it('recognizes any active transaction filter', () => {
    expect(hasTransactionFilters({})).toBe(false)
    expect(hasTransactionFilters({ month: '2026-08' })).toBe(true)
    expect(hasTransactionFilters({ category: 'Grocery', q: 'whole foods' })).toBe(true)
    expect(hasTransactionFilters({ review: 'pending' })).toBe(true)
  })

  it('keeps pending report decisions distinct from explicitly skipped transactions', () => {
    expect(transactionReportDisposition({ included: false, excluded: false })).toBe('pending')
    expect(transactionReportDisposition({ included: true, excluded: false })).toBe('included')
    expect(transactionReportDisposition({ included: false, excluded: true })).toBe('excluded')
  })
})
