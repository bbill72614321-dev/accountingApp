'use client'

import { deleteTransaction } from '@/app/actions/transactions'

export function DeleteTransactionForm({ transactionId, label, confirmation }: {
  transactionId: string
  label: string
  confirmation: string
}) {
  return (
    <form action={deleteTransaction} onSubmit={(event) => {
      if (!window.confirm(confirmation)) event.preventDefault()
    }}>
      <input name="transaction_id" type="hidden" value={transactionId} />
      <button className="ledger-delete" type="submit">{label}</button>
    </form>
  )
}
