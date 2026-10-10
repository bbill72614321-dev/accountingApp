'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import type { ActionState } from '@/app/actions/transactions'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

type Labels = Pick<Dictionary, 'merchant' | 'category' | 'noSpendingCategory' | 'date' | 'amount' | 'transactionType' | 'expense' | 'income' | 'note' | 'save' | 'cancel' | 'invalidTransaction' | 'invalidAmount' | 'invalidCategory' | 'invalidDate' | 'saveTransactionFailed' | 'updateTransactionFailed'>

const initialState: ActionState = { status: 'idle', message: '' }

type FormValues = {
  id?: string
  merchant?: string
  category?: Category | null
  date?: string
  amount?: string
  type?: 'expense' | 'income'
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
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(values.type ?? 'expense')
  const [category, setCategory] = useState<Category | ''>(
    values.type === 'income' ? '' : values.category === undefined ? 'Other' : values.category ?? 'Other',
  )
  const message = state.message in dictionary ? dictionary[state.message as keyof Labels] : state.message

  return (
    <form action={formAction} className="form-stack">
      {values.id && <input name="transaction_id" type="hidden" value={values.id} />}
      <label htmlFor="merchant">{dictionary.merchant}</label>
      <input defaultValue={values.merchant} id="merchant" maxLength={200} name="merchant" />
      <label htmlFor="category">{dictionary.category}</label>
      <select id="category" name="category" onChange={(event) => setCategory(event.target.value as Category | '')} value={category}>
        {transactionType === 'income' ? <option value="">{dictionary.noSpendingCategory}</option> : CATEGORIES.map((item) => (
          <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>
        ))}
      </select>
      <label htmlFor="date">{dictionary.date}</label>
      <input defaultValue={values.date} id="date" name="date" required type="date" />
      <label htmlFor="type">{dictionary.transactionType}</label>
      <select id="type" name="type" onChange={(event) => {
        const nextType = event.target.value as 'expense' | 'income'
        setTransactionType(nextType)
        setCategory(nextType === 'income' ? '' : 'Other')
      }} value={transactionType}>
        <option value="expense">{dictionary.expense}</option>
        <option value="income">{dictionary.income}</option>
      </select>
      <label htmlFor="amount">{dictionary.amount}</label>
      <input defaultValue={values.amount} id="amount" inputMode="decimal" min="0" name="amount" placeholder="12.34" required />
      <label htmlFor="note">{dictionary.note}</label>
      <textarea defaultValue={values.note} id="note" maxLength={1000} name="note" />
      {state.status === 'error' && <p role="alert">{message}</p>}
      <div className="form-actions">
        <Link className="button" href="/transactions">{dictionary.cancel}</Link>
        <button className="primary-action" disabled={pending} type="submit">{dictionary.save}</button>
      </div>
    </form>
  )
}
