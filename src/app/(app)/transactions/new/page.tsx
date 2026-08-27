import { createManualTransaction } from '@/app/actions/transactions'
import { ManualTransactionForm } from '@/components/manual-transaction-form'

export default function NewTransactionPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">New transaction</h1>
      <ManualTransactionForm action={createManualTransaction} />
    </>
  )
}
