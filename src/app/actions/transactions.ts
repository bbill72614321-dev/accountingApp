'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { CATEGORIES } from '@/features/transactions/categories'
import { normalizeMerchant } from '@/features/transactions/merchant'
import { manualTransactionSchema } from '@/features/transactions/validation'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export type ActionState = { status: 'idle' | 'success' | 'error'; message: string }

const transactionIdSchema = z.string().uuid()
const transactionCategorySchema = z.object({
  transactionId: transactionIdSchema,
  category: z.enum(CATEGORIES),
})
const transactionNoteSchema = z.object({
  transactionId: transactionIdSchema,
  note: z.string().trim().max(1000),
})
const inclusionSchema = z.object({
  transactionId: transactionIdSchema,
  included: z.enum(['true', 'false']),
})

function manualFields(formData: FormData) {
  return {
    merchant: formData.get('merchant'),
    category: formData.get('category'),
    date: formData.get('date'),
    amount: formData.get('amount'),
    note: formData.get('note'),
  }
}

function revalidateLedger() {
  revalidatePath('/transactions')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

export async function createManualTransaction(
  _state: ActionState, formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()
  const parsed = manualTransactionSchema.safeParse(manualFields(formData))
  if (!parsed.success) return { status: 'error', message: 'invalidTransaction' }

  const supabase = await createServerClient()
  const { merchant, category, date, amount, note } = parsed.data
  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    source: 'manual',
    raw_description: merchant,
    normalized_merchant: normalizeMerchant(merchant),
    source_category: category,
    transaction_date: date,
    amount_cents: amount,
    note,
  })
  if (error) return { status: 'error', message: 'saveTransactionFailed' }
  revalidateLedger()
  redirect('/transactions')
}

export async function updateManualTransaction(
  _state: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const id = transactionIdSchema.safeParse(formData.get('transaction_id'))
  const parsed = manualTransactionSchema.safeParse(manualFields(formData))
  if (!id.success || !parsed.success) return { status: 'error', message: 'invalidTransaction' }

  const supabase = await createServerClient()
  const { merchant, category, date, amount, note } = parsed.data
  const { error } = await supabase.rpc('update_manual_transaction_and_rule', {
    p_transaction_id: id.data,
    p_merchant: merchant,
    p_normalized_merchant: normalizeMerchant(merchant),
    p_category: category,
    p_transaction_date: date,
    p_amount_cents: amount,
    p_note: note,
  })
  if (error) return { status: 'error', message: 'updateTransactionFailed' }
  revalidateLedger()
  redirect('/transactions')
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const id = transactionIdSchema.safeParse(formData.get('transaction_id'))
  if (!id.success) throw new Error('Invalid transaction')

  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').delete()
    .eq('id', id.data).eq('user_id', user.id).eq('source', 'manual').select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to delete transaction')
  revalidateLedger()
  redirect('/transactions')
}

export async function updateTransactionCategory(formData: FormData): Promise<void> {
  await requireUser()
  const parsed = transactionCategorySchema.safeParse({
    transactionId: formData.get('transaction_id'), category: formData.get('category'),
  })
  if (!parsed.success) throw new Error('Invalid transaction category')

  const supabase = await createServerClient()
  const { error } = await supabase.rpc('set_transaction_category_and_rule', {
    p_transaction_id: parsed.data.transactionId,
    p_category: parsed.data.category,
  })
  if (error) throw new Error('Unable to update transaction category')
  revalidateLedger()
}

export async function updateTransactionNote(formData: FormData): Promise<void> {
  const user = await requireUser()
  const parsed = transactionNoteSchema.safeParse({
    transactionId: formData.get('transaction_id'), note: formData.get('note'),
  })
  if (!parsed.success) throw new Error('Invalid transaction note')

  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').update({ note: parsed.data.note })
    .eq('id', parsed.data.transactionId).eq('user_id', user.id).select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to update transaction note')
  revalidateLedger()
}

export async function setTransactionIncluded(formData: FormData): Promise<void> {
  const user = await requireUser()
  const parsed = inclusionSchema.safeParse({
    transactionId: formData.get('transaction_id'), included: formData.get('included'),
  })
  if (!parsed.success) throw new Error('Invalid inclusion setting')

  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').update({
    include_in_report: parsed.data.included === 'true',
  }).eq('id', parsed.data.transactionId).eq('user_id', user.id).select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to update inclusion setting')
  revalidateLedger()
}

export async function deleteMerchantRule(formData: FormData): Promise<void> {
  const user = await requireUser()
  const id = transactionIdSchema.safeParse(formData.get('rule_id'))
  if (!id.success) throw new Error('Invalid merchant rule')

  const supabase = await createServerClient()
  const { data, error } = await supabase.from('merchant_rules').delete()
    .eq('id', id.data).eq('user_id', user.id).select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to delete merchant rule')
  revalidateLedger()
}
