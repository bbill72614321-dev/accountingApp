import { describe, expect, it } from 'vitest'
import { disconnectConfirmation } from './disconnect-confirmation'

describe('disconnectConfirmation', () => {
  it('inserts the institution into the English irreversible-action prompt', () => {
    expect(disconnectConfirmation('Chase', 'Disconnect {institution} and permanently delete its imported data? This cannot be undone.'))
      .toBe('Disconnect Chase and permanently delete its imported data? This cannot be undone.')
  })

  it('inserts the institution into the Chinese irreversible-action prompt', () => {
    expect(disconnectConfirmation('大通銀行', '要解除 {institution} 並永久刪除其匯入資料嗎？此操作無法復原。'))
      .toBe('要解除 大通銀行 並永久刪除其匯入資料嗎？此操作無法復原。')
  })
})
