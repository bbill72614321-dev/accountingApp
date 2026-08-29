import 'server-only'

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { getPlaidEnv } from '@/lib/env'

export function createPlaidClient() {
  const env = getPlaidEnv()
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.environment],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': env.clientId,
        'PLAID-SECRET': env.secret,
      },
    },
  })
  return new PlaidApi(configuration)
}
