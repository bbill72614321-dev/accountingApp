import { notFound } from 'next/navigation'
import { z } from 'zod'
import { deleteTransaction, updateManualTransaction } from '@/app/actions/transactions'
import { ManualTransactionForm } from '@/components/manual-transaction-form'
import { displayedCategory } from '@/features/transactions/merchant-rule'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getDictionary, getLanguage } from '@/lib/i18n'

const idSchema = z.string().uuid()

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = idSchema.safeParse(rawId)
  if (!id.success) notFound()

  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transactions').select(
    'id, raw_description, source_category, category_override, transaction_date, amount_cents, note',
  ).eq('id', id.data).eq('user_id', user.id).eq('source', 'manual').maybeSingle()
  if (error || !data) notFound()

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">{dictionary.edit}</h1>
      <ManualTransactionForm action={updateManualTransaction} language={language} labels={dictionary} values={{
        id: data.id,
        merchant: data.raw_description ?? '',
        category: displayedCategory({
          sourceCategory: data.source_category,
          categoryOverride: data.category_override,
        }),
        date: data.transaction_date,
        amount: String(Math.abs(data.amount_cents) / 100),
        type: data.amount_cents < 0 ? 'expense' : 'income',
        note: data.note,
      }} />
      <form action={deleteTransaction} className="mt-6">
        <input name="transaction_id" type="hidden" value={data.id} />
        <button type="submit">{dictionary.delete}</button>
      </form>
    </>
  )
}
