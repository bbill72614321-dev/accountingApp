import { CountryCode, type LinkTokenCreateRequest } from 'plaid'
import type { PlaidSyncRepository } from './sync-owned-item'

type LinkTokenClient = {
  linkTokenCreate(request: LinkTokenCreateRequest): Promise<{ data: { link_token: string } }>
}

export async function createUpdateAccountLinkToken({
  userId,
  itemId,
  webhookUrl,
  repository,
  client,
}: {
  userId: string
  itemId: string
  webhookUrl: string
  repository: Pick<PlaidSyncRepository, 'findOwnedItem'>
  client: LinkTokenClient
}): Promise<string> {
  const item = await repository.findOwnedItem(userId, itemId)
  if (!item) throw new Error('Not found')

  const { data } = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Personal Finance',
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: webhookUrl,
    access_token: item.accessToken,
    update: { account_selection_enabled: true },
  })
  return data.link_token
}
