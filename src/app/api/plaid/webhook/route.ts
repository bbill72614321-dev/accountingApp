import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose'
import { z } from 'zod'
import { createPlaidGateway } from '@/lib/plaid/gateway'
import { createPlaidClient } from '@/lib/plaid/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabasePlaidRepository } from '@/features/plaid/supabase-repository'
import { syncOwnedItem } from '@/features/plaid/sync-owned-item'

const webhookSchema = z.object({ item_id: z.string().min(1), webhook_type: z.string(), webhook_code: z.string() })

async function verifyWebhook(token: string, rawBody: string) {
  const header = decodeProtectedHeader(token)
  if (header.alg !== 'ES256' || !header.kid) throw new Error('Invalid Plaid signature')
  const { data } = await createPlaidClient().webhookVerificationKeyGet({ key_id: header.kid })
  const key = await importJWK(data.key, 'ES256')
  const { payload } = await jwtVerify(token, key, { algorithms: ['ES256'] })
  const issuedAt = typeof payload.iat === 'number' ? payload.iat : 0
  if (Math.abs(Date.now() / 1000 - issuedAt) > 300) throw new Error('Expired Plaid signature')
  const receivedHash = typeof payload.request_body_sha256 === 'string' ? payload.request_body_sha256 : ''
  const expectedHash = createHash('sha256').update(rawBody).digest('hex')
  if (receivedHash.length !== expectedHash.length || !timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash))) throw new Error('Invalid Plaid payload')
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('plaid-verification')
  if (!signature) return NextResponse.json({ error: 'Missing Plaid signature' }, { status: 401 })
  try {
    await verifyWebhook(signature, rawBody)
    const webhook = webhookSchema.parse(JSON.parse(rawBody))
    if (webhook.webhook_type !== 'TRANSACTIONS' || webhook.webhook_code !== 'SYNC_UPDATES_AVAILABLE') return new NextResponse(null, { status: 200 })
    const admin = createAdminClient()
    const { data: item } = await admin.from('bank_items').select('id, user_id').eq('plaid_item_id', webhook.item_id).maybeSingle()
    if (!item) return new NextResponse(null, { status: 200 })
    const plaid = createPlaidClient()
    await syncOwnedItem({ userId: item.user_id, itemId: item.id, gateway: createPlaidGateway(plaid), repository: createSupabasePlaidRepository(admin) })
    return new NextResponse(null, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Invalid Plaid webhook' }, { status: 401 })
  }
}
