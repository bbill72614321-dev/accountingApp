'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setTransactionReviewed } from '@/app/actions/transactions'
import type { Dictionary } from '@/lib/i18n'

export function TransactionReviewedToggle({
  dictionary, reviewedAt, transactionId,
}: {
  dictionary: Dictionary
  reviewedAt: string | null | undefined
  transactionId: string
}) {
  const router = useRouter()
  const [reviewed, setReviewed] = useState(Boolean(reviewedAt))
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const nextReviewed = !reviewed
    setReviewed(nextReviewed)
    const formData = new FormData()
    formData.set('transaction_id', transactionId)
    formData.set('reviewed', String(nextReviewed))
    startTransition(async () => {
      try {
        await setTransactionReviewed(formData)
        router.refresh()
      } catch {
        setReviewed(!nextReviewed)
      }
    })
  }

  return (
    <label className="transaction-reviewed-toggle">
      <input aria-label={dictionary.markReviewed} checked={reviewed} disabled={isPending} onChange={toggle} type="checkbox" />
      <span>{dictionary.reviewed}</span>
    </label>
  )
}
