import { describe, expect, it } from 'vitest'
import {
  canDeleteTransaction,
  isCurrentNavigationPath,
  isPendingFilter,
  transactionSourceLabel,
  transactionStatus,
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
})
