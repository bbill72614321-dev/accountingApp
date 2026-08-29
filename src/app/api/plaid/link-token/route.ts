import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { requireUser } from '@/lib/auth'
import { createPlaidClient } from '@/lib/plaid/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerEnv } from '@/lib/env'

export async function POST() {
  const user = await requireUser()
  const admin = createAdminClient()
  const { count, error } = await admin.from('bank_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Unable to check connection limit' }, { status: 500 })
  if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Connection limit reached' }, { status: 409 })

  const { data } = await createPlaidClient().linkTokenCreate({
    user: { client_user_id: user.id }, client_name: 'Private Ledger',
    products: [Products.Transactions], country_codes: [CountryCode.Us], language: 'en',
    transactions: { days_requested: 90 },
    webhook: `${getServerEnv().appUrl}/api/plaid/webhook`,
  })
  return NextResponse.json({ linkToken: data.link_token })
}
