import { describe, expect, it } from 'vitest'
import type { LinkTokenCreateRequest } from 'plaid'
import { createUpdateAccountLinkToken } from './update-account-access'

describe('createUpdateAccountLinkToken', () => {
  it('opens account selection for the owned Item using its existing access token', async () => {
    let request: LinkTokenCreateRequest | undefined
    const linkToken = await createUpdateAccountLinkToken({
      userId: 'user-a', itemId: 'item-a', webhookUrl: 'https://example.com/api/plaid/webhook',
      repository: { async findOwnedItem() { return { accessToken: 'existing-secret', cursor: 'cursor-1' } } },
      client: { async linkTokenCreate(input) { request = input; return { data: { link_token: 'update-link-token' } } } },
    })

    expect(linkToken).toBe('update-link-token')
    expect(request).toMatchObject({
      access_token: 'existing-secret', update: { account_selection_enabled: true },
      user: { client_user_id: 'user-a' }, country_codes: ['US'],
    })
    expect(request).not.toHaveProperty('products')
  })

  it('rejects an Item belonging to another user before calling Plaid', async () => {
    let plaidCalled = false
    await expect(createUpdateAccountLinkToken({
      userId: 'user-b', itemId: 'item-a', webhookUrl: 'https://example.com/api/plaid/webhook',
      repository: { async findOwnedItem() { return null } },
      client: { async linkTokenCreate() { plaidCalled = true; return { data: { link_token: 'unexpected' } } } },
    })).rejects.toThrow('Not found')
    expect(plaidCalled).toBe(false)
  })
})
