'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export type AccountNameState = { status: 'idle' | 'success' | 'error' }

const inputSchema = z.object({
  accountId: z.string().uuid(),
  displayName: z.string().trim().max(60),
})

export async function renameBankAccount(_state: AccountNameState, formData: FormData): Promise<AccountNameState> {
  const user = await requireUser()
  const input = inputSchema.safeParse({
    accountId: formData.get('account_id'),
    displayName: formData.get('display_name'),
  })
  if (!input.success) return { status: 'error' }

  try {
    const { data, error } = await createAdminClient().from('bank_accounts')
      .update({ display_name: input.data.displayName || null })
      .eq('id', input.data.accountId).eq('user_id', user.id)
      .select('id').maybeSingle()
    if (error || !data) return { status: 'error' }
  } catch {
    return { status: 'error' }
  }

  revalidatePath('/settings')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { status: 'success' }
}
