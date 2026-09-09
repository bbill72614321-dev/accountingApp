'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { CATEGORIES } from '@/features/transactions/categories'
import { normalizeMerchant } from '@/features/transactions/merchant'
import { displayedCategory } from '@/features/transactions/merchant-rule'
import { canSaveSplitPayment, shouldTrackReimbursement } from '@/features/transactions/split-payment'
import { canConfirmImportedTransaction, canIncludeTransaction, canUseIncomeCategory, manualTransactionSchema } from '@/features/transactions/validation'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export type ActionState = { status: 'idle' | 'success' | 'error'; message: string }

const transactionIdSchema = z.string().uuid()
const transactionCategorySchema = z.object({
  transactionId: transactionIdSchema,
  category: z.preprocess((value) => value === '' ? null : value, z.enum(CATEGORIES).nullable()),
})
const transactionNoteSchema = z.object({
  transactionId: transactionIdSchema,
  note: z.string().trim().max(1000),
})
const inclusionSchema = z.object({
  transactionId: transactionIdSchema,
  included: z.enum(['true', 'false']),
})
const splitSchema = z.object({
  transactionId: transactionIdSchema,
  splitCount: z.coerce.number().int().min(2).max(100),
  personalAmount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/),
})

function manualFields(formData: FormData) {
  return {
    merchant: formData.get('merchant'),
    category: formData.get('category'),
    date: formData.get('date'),
    type: formData.get('type'),
    amount: formData.get('amount'),
    note: formData.get('note'),
  }
}

function revalidateLedger() {
  revalidatePath('/transactions')
  revalidatePath('/reimbursements')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/reports/monthly')
  revalidatePath('/api/reports/monthly.xlsx')
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
  const user = await requireUser()
  const parsed = transactionCategorySchema.safeParse({
    transactionId: formData.get('transaction_id'), category: formData.get('category'),
  })
  if (!parsed.success) throw new Error('Invalid transaction category')

  const supabase = await createServerClient()
  const { data: transaction, error: transactionError } = await supabase.from('transactions').select('amount_cents')
    .eq('id', parsed.data.transactionId).eq('user_id', user.id).maybeSingle()
  if (transactionError || !transaction || (!canUseIncomeCategory(transaction.amount_cents) && parsed.data.category === null)) {
    throw new Error('Unable to update transaction category')
  }
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
  if (parsed.data.included === 'true') {
    const { data: transaction, error: transactionError } = await supabase.from('transactions')
      .select('amount_cents, source_category, category_override')
      .eq('id', parsed.data.transactionId).eq('user_id', user.id).maybeSingle()
    if (transactionError || !transaction || !canIncludeTransaction({
      amountCents: transaction.amount_cents,
      category: displayedCategory({ sourceCategory: transaction.source_category, categoryOverride: transaction.category_override }),
    })) throw new Error('Unable to include transaction')
  }
  const { data, error } = await supabase.from('transactions').update({
    include_in_report: parsed.data.included === 'true',
  }).eq('id', parsed.data.transactionId).eq('user_id', user.id).select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to update inclusion setting')
  revalidateLedger()
}

export async function saveTransactionSplit(formData: FormData): Promise<ActionState> {
  const user = await requireUser()
  const parsed = splitSchema.safeParse({
    transactionId: formData.get('transaction_id'),
    splitCount: formData.get('split_count'),
    personalAmount: formData.get('personal_amount'),
  })
  if (!parsed.success) return { status: 'error', message: 'invalidSplit' }

  const personalAmountCents = Math.round(Number(parsed.data.personalAmount) * 100)
  const supabase = await createServerClient()
  const { data: transaction, error: transactionError } = await supabase.from('transactions').select('amount_cents')
    .eq('id', parsed.data.transactionId).eq('user_id', user.id).maybeSingle()
  if (transactionError || !transaction || !canSaveSplitPayment({
    amountCents: transaction.amount_cents,
    splitCount: parsed.data.splitCount,
    personalAmountCents,
  })) return { status: 'error', message: 'invalidSplit' }

  if (!shouldTrackReimbursement(Math.abs(transaction.amount_cents), personalAmountCents)) {
    const { error } = await supabase.from('transaction_splits').delete()
      .eq('transaction_id', parsed.data.transactionId).eq('user_id', user.id)
    if (error) return { status: 'error', message: 'saveSplitFailed' }
    revalidateLedger()
    return { status: 'success', message: '' }
  }

  const { error } = await supabase.from('transaction_splits').upsert({
    user_id: user.id,
    transaction_id: parsed.data.transactionId,
    split_count: parsed.data.splitCount,
    personal_amount_cents: personalAmountCents,
  }, { onConflict: 'transaction_id' })
  if (error) return { status: 'error', message: 'saveSplitFailed' }
  revalidateLedger()
  return { status: 'success', message: '' }
}

export async function markSplitRequested(formData: FormData): Promise<void> {
  const user = await requireUser()
  const transactionId = transactionIdSchema.safeParse(formData.get('transaction_id'))
  if (!transactionId.success) throw new Error('Invalid transaction')

  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transaction_splits').update({ requested_at: new Date().toISOString() })
    .eq('transaction_id', transactionId.data).eq('user_id', user.id).is('requested_at', null).select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to mark split as requested')
  revalidateLedger()
}

export async function confirmImportedTransaction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const id = transactionIdSchema.safeParse(formData.get('transaction_id'))
  if (!id.success) throw new Error('Invalid transaction')

  const supabase = await createServerClient()
  const { data: transaction, error: transactionError } = await supabase.from('transactions')
    .select('amount_cents, source_category, category_override, include_in_report')
    .eq('id', id.data).eq('user_id', user.id).eq('source', 'plaid').maybeSingle()
  if (transactionError || !transaction || !canConfirmImportedTransaction({
    amountCents: transaction.amount_cents,
    category: displayedCategory({ sourceCategory: transaction.source_category, categoryOverride: transaction.category_override }),
    included: transaction.include_in_report,
  })) throw new Error('Unable to confirm transaction')

  const { data, error } = await supabase.from('transactions').update({
    review_status: 'confirmed',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq('id', id.data).eq('user_id', user.id).eq('source', 'plaid')
    .eq('provider_pending', false).eq('review_status', 'needs_review').select('id').maybeSingle()
  if (error || !data) throw new Error('Unable to confirm transaction')
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
