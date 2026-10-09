import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createUpdateAccountLinkToken } from '@/features/plaid/update-account-access'
import { requireUser } from '@/lib/auth'
import { getServerEnv } from '@/lib/env'
import { createPlaidClient } from '@/lib/plaid/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabasePlaidRepository } from '@/features/plaid/supabase-repository'

const requestSchema = z.object({ itemId: z.string().uuid() })

export async function POST(request: Request) {
  const user = await requireUser()
  const body = requestSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid bank connection' }, { status: 400 })

  try {
    const linkToken = await createUpdateAccountLinkToken({
      userId: user.id,
      itemId: body.data.itemId,
      webhookUrl: `${getServerEnv().appUrl}/api/plaid/webhook`,
      repository: createSupabasePlaidRepository(createAdminClient()),
      client: createPlaidClient(),
    })
    return NextResponse.json({ linkToken })
  } catch (error) {
    if (error instanceof Error && error.message === 'Not found') {
      return NextResponse.json({ error: 'Bank connection not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unable to update account access' }, { status: 500 })
  }
}
