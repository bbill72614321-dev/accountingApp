'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTransactionCategory } from '@/app/actions/transactions'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

export function TransactionCategorySelect({
  category, dictionary, language, transactionId,
}: {
  category: Category | null
  dictionary: Dictionary
  language: Language
  transactionId: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(category ?? '')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function saveCategory(nextCategory: string) {
    const previousCategory = selected
    setSelected(nextCategory)
    setMessage('')
    const formData = new FormData()
    formData.set('transaction_id', transactionId)
    formData.set('category', nextCategory)
    startTransition(async () => {
      try {
        await updateTransactionCategory(formData)
        router.refresh()
      } catch {
        setSelected(previousCategory)
        setMessage(dictionary.updateTransactionFailed)
      }
    })
  }

  return (
    <div className="transaction-category-control">
      <label className="sr-only" htmlFor={`category-${transactionId}`}>{dictionary.category}</label>
      <select
        aria-describedby={message ? `category-error-${transactionId}` : undefined}
        aria-label={dictionary.category}
        data-auto-category="true"
        disabled={isPending}
        id={`category-${transactionId}`}
        onChange={(event) => saveCategory(event.target.value)}
        value={selected}
      >
        <option value="">{dictionary.chooseCategory}</option>
        {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>)}
      </select>
      {message && <p id={`category-error-${transactionId}`} role="alert">{message}</p>}
    </div>
  )
}
