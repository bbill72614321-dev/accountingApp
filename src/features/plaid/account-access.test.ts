import { describe, expect, it } from 'vitest'
import { compareAccountAccess } from './account-access'

describe('compareAccountAccess', () => {
  it('distinguishes added, retained, and removed accounts by provider ID, not last four digits', () => {
    expect(compareAccountAccess(['kept', 'lost'], ['kept', 'new'])).toEqual({
      added: ['new'], retained: ['kept'], removed: ['lost'],
    })
  })

  it('does not invent a change history for legacy connections without a verified baseline', () => {
    expect(compareAccountAccess(null, ['current'])).toBeNull()
  })

  it('handles removing all accounts and restoring access from an empty baseline', () => {
    expect(compareAccountAccess(['old'], [])).toEqual({ added: [], retained: [], removed: ['old'] })
    expect(compareAccountAccess([], ['restored'])).toEqual({ added: ['restored'], retained: [], removed: [] })
  })
})
