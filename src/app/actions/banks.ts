'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { disconnectOwnedItem } from '@/features/plaid/disconnect-owned-item'
import { createSupabasePlaidRepository } from '@/features/plaid/supabase-repository'
import { requireUser } from '@/lib/auth'
import { createPlaidGateway } from '@/lib/plaid/gateway'
import { createPlaidClient } from '@/lib/plaid/client'
import { createAdminClient } from '@/lib/supabase/admin'

const bankItemIdSchema = z.string().uuid()

export type DisconnectBankActionState = { status: 'idle' | 'success' | 'error'; message: '' | 'disconnectBankError' }

export async function disconnectBankItem(
  _state: DisconnectBankActionState,
  formData: FormData,
): Promise<DisconnectBankActionState> {
  const user = await requireUser()
  const itemId = bankItemIdSchema.safeParse(formData.get('bank_item_id'))
  if (!itemId.success) return { status: 'error', message: 'disconnectBankError' }

  try {
    await disconnectOwnedItem({
      userId: user.id,
      itemId: itemId.data,
      gateway: createPlaidGateway(createPlaidClient()),
      repository: createSupabasePlaidRepository(createAdminClient()),
    })
  } catch {
    return { status: 'error', message: 'disconnectBankError' }
  }

  revalidatePath('/banks')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports/monthly')
  return { status: 'success', message: '' }
}
