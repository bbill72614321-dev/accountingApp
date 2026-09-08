import { describe, expect, it, vi } from 'vitest'
import { disconnectOwnedItem } from './disconnect-owned-item'

describe('disconnectOwnedItem', () => {
  it('removes Plaid access before deleting the owned local item', async () => {
    const calls: string[] = []
    const gateway = { removeItem: vi.fn(async () => { calls.push('plaid') }) }
    const repository = {
      findOwnedItem: vi.fn(async () => ({ accessToken: 'token' })),
      deleteOwnedItem: vi.fn(async () => { calls.push('database') }),
    }

    await disconnectOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })

    expect(calls).toEqual(['plaid', 'database'])
  })

  it('does not contact Plaid or delete data for another user item', async () => {
    const gateway = { removeItem: vi.fn() }
    const repository = {
      findOwnedItem: vi.fn(async () => null),
      deleteOwnedItem: vi.fn(),
    }

    await expect(disconnectOwnedItem({ userId: 'user-b', itemId: 'item-a', gateway, repository })).rejects.toThrow('Not found')

    expect(gateway.removeItem).not.toHaveBeenCalled()
    expect(repository.deleteOwnedItem).not.toHaveBeenCalled()
  })

  it('preserves local data when Plaid removal fails', async () => {
    const gateway = { removeItem: vi.fn(async () => { throw new Error('provider failure') }) }
    const repository = {
      findOwnedItem: vi.fn(async () => ({ accessToken: 'token' })),
      deleteOwnedItem: vi.fn(),
    }

    await expect(disconnectOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository }))
      .rejects.toThrow('Unable to remove bank connection')

    expect(repository.deleteOwnedItem).not.toHaveBeenCalled()
  })
})
