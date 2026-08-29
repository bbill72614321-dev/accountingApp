import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createPlaidGateway } from '@/lib/plaid/gateway'
import { createPlaidClient } from '@/lib/plaid/client'
import { encryptAccessToken } from '@/lib/plaid/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabasePlaidRepository } from '@/features/plaid/supabase-repository'
import { syncOwnedItem } from '@/features/plaid/sync-owned-item'

const requestSchema = z.object({ publicToken: z.string().min(1) })

export async function POST(request: Request) {
  const user = await requireUser()
  const body = requestSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid Link token' }, { status: 400 })
  const plaid = createPlaidClient()
  const { data: exchange } = await plaid.itemPublicTokenExchange({ public_token: body.data.publicToken })
  const { data: itemData } = await plaid.itemGet({ access_token: exchange.access_token })
  const { data: accountData } = await plaid.accountsGet({ access_token: exchange.access_token })
  const admin = createAdminClient()
  const { count } = await admin.from('bank_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Connection limit reached' }, { status: 409 })
  const { data: item, error } = await admin.from('bank_items').upsert({
    user_id: user.id, plaid_item_id: exchange.item_id,
    institution_name: itemData.item.institution_id ?? 'Connected institution',
    institution_id: itemData.item.institution_id, status: 'active',
  }, { onConflict: 'plaid_item_id' }).select('id').single()
  if (error || !item) return NextResponse.json({ error: 'Unable to save connection' }, { status: 500 })
  const encrypted = encryptAccessToken(exchange.access_token)
  const secret = await admin.from('plaid_item_secrets').upsert({ bank_item_id: item.id, access_token_ciphertext: encrypted.ciphertext, access_token_iv: encrypted.iv, access_token_tag: encrypted.tag })
  if (secret.error) return NextResponse.json({ error: 'Unable to secure connection' }, { status: 500 })
  const accounts = await admin.from('bank_accounts').upsert(accountData.accounts.map((account) => ({
    user_id: user.id, bank_item_id: item.id, plaid_account_id: account.account_id,
    name: account.name, official_name: account.official_name, mask: account.mask,
    type: account.type, subtype: account.subtype,
  })), { onConflict: 'plaid_account_id' })
  if (accounts.error) return NextResponse.json({ error: 'Unable to save accounts' }, { status: 500 })
  await syncOwnedItem({ userId: user.id, itemId: item.id, gateway: createPlaidGateway(plaid), repository: createSupabasePlaidRepository(admin) })
  return NextResponse.json({ itemId: item.id })
}
