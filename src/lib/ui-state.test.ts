import { describe, expect, it } from 'vitest'
import { canDeleteTransaction, isCurrentNavigationPath } from './ui-state'

describe('UI state helpers', () => {
  it('marks the monthly summary as current only on its own path', () => {
    expect(isCurrentNavigationPath('/dashboard', '/dashboard')).toBe(true)
    expect(isCurrentNavigationPath('/dashboard', '/transactions')).toBe(false)
  })

  it('allows deletion only for manual transactions', () => {
    expect(canDeleteTransaction('manual')).toBe(true)
    expect(canDeleteTransaction('plaid')).toBe(false)
  })
})
