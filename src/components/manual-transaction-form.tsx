'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/actions/transactions'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

type Labels = Pick<Dictionary, 'merchant' | 'category' | 'noSpendingCategory' | 'date' | 'amount' | 'note' | 'save' | 'invalidTransaction' | 'saveTransactionFailed' | 'updateTransactionFailed'>

const initialState: ActionState = { status: 'idle', message: '' }

type FormValues = {
  id?: string
  merchant?: string
  category?: Category | null
  date?: string
  amount?: string
  note?: string
}

export function ManualTransactionForm({
  action, values = {}, language = 'en', labels,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  values?: FormValues
  language?: Language
  labels: Labels
}) {
  const dictionary = labels
  const [state, formAction, pending] = useActionState(action, initialState)
  const message = state.message in dictionary ? dictionary[state.message as keyof Labels] : state.message

  return (
    <form action={formAction} className="grid max-w-md gap-3">
      {values.id && <input name="transaction_id" type="hidden" value={values.id} />}
      <label htmlFor="merchant">{dictionary.merchant}</label>
      <input defaultValue={values.merchant} id="merchant" maxLength={200} name="merchant" />
      <label htmlFor="category">{dictionary.category}</label>
      <select defaultValue={values.category === undefined ? 'Other' : values.category ?? ''} id="category" name="category">
        <option value="">{dictionary.noSpendingCategory}</option>
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>{CATEGORY_LABELS[category][language]}</option>
        ))}
      </select>
      <label htmlFor="date">{dictionary.date}</label>
      <input defaultValue={values.date} id="date" name="date" required type="date" />
      <label htmlFor="amount">{dictionary.amount}</label>
      <input defaultValue={values.amount} id="amount" inputMode="decimal" name="amount" placeholder="-12.34" required />
      <label htmlFor="note">{dictionary.note}</label>
      <textarea defaultValue={values.note} id="note" maxLength={1000} name="note" />
      {state.status === 'error' && <p role="alert">{message}</p>}
      <button disabled={pending} type="submit">{dictionary.save}</button>
    </form>
  )
}
