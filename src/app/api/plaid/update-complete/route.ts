import { NextResponse } from 'next/server'
import { z } from 'zod'
import { syncOwnedItem } from '@/features/plaid/sync-owned-item'
import { createSupabasePlaidRepository } from '@/features/plaid/supabase-repository'
import { requireUser } from '@/lib/auth'
import { createPlaidClient } from '@/lib/plaid/client'
import { createPlaidGateway } from '@/lib/plaid/gateway'
import { createAdminClient } from '@/lib/supabase/admin'

const requestSchema = z.object({ itemId: z.string().uuid() })

export async function POST(request: Request) {
  const user = await requireUser()
  const body = requestSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid bank connection' }, { status: 400 })

  try {
    const plaid = createPlaidClient()
    await syncOwnedItem({
      userId: user.id,
      itemId: body.data.itemId,
      gateway: createPlaidGateway(plaid),
      repository: createSupabasePlaidRepository(createAdminClient()),
    })
    return NextResponse.json({ itemId: body.data.itemId })
  } catch (error) {
    if (error instanceof Error && error.message === 'Not found') {
      return NextResponse.json({ error: 'Bank connection not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unable to sync newly shared accounts' }, { status: 500 })
  }
}
