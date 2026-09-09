'use client'

import { useRef, useState, useTransition } from 'react'
import { saveTransactionSplit, type ActionState } from '@/app/actions/transactions'
import { defaultPersonalShareCents, owedAmountCents } from '@/features/transactions/split-payment'
import type { Dictionary } from '@/lib/i18n'

type Split = {
  split_count: number
  personal_amount_cents: number
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2)
}

export function SplitPaymentDialog({
  amountCents,
  dictionary,
  split,
  transactionId,
}: {
  amountCents: number
  dictionary: Dictionary
  split?: Split | null
  transactionId: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [splitCount, setSplitCount] = useState(split?.split_count ?? 2)
  const [personalAmount, setPersonalAmount] = useState(dollars(split?.personal_amount_cents ?? defaultPersonalShareCents(amountCents, 2)))
  const [state, setState] = useState<ActionState>({ status: 'idle', message: '' })
  const [isPending, startTransition] = useTransition()
  const totalAmountCents = Math.abs(amountCents)
  const personalAmountCents = Math.round(Number(personalAmount || 0) * 100)
  const owedCents = owedAmountCents(totalAmountCents, personalAmountCents)

  function updateSplitCount(value: number) {
    setSplitCount(value)
    if (Number.isInteger(value) && value >= 2) setPersonalAmount(dollars(defaultPersonalShareCents(amountCents, value)))
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveTransactionSplit(formData)
      setState(result)
      if (result.status === 'success') dialog.current?.close()
    })
  }

  return (
    <>
      <button className="ledger-button" onClick={() => dialog.current?.showModal()} type="button">{split ? dictionary.editSplit : dictionary.split}</button>
      <dialog aria-labelledby={`split-title-${transactionId}`} className="split-dialog" ref={dialog}>
        <form action={submit} className="split-form">
          <input name="transaction_id" type="hidden" value={transactionId} />
          <div>
            <h2 id={`split-title-${transactionId}`}>{dictionary.splitPayment}</h2>
            <p>{dictionary.totalCharged}: <strong>${dollars(totalAmountCents)}</strong></p>
          </div>
          <label>
            {dictionary.splitCount}
            <input min="2" max="100" name="split_count" onChange={(event) => updateSplitCount(Number(event.target.value))} required step="1" type="number" value={splitCount} />
          </label>
          <label>
            {dictionary.yourShare} (USD)
            <input min="0" max={dollars(totalAmountCents)} name="personal_amount" onChange={(event) => setPersonalAmount(event.target.value)} required step="0.01" type="number" value={personalAmount} />
          </label>
          <p className="split-owed">{dictionary.amountOwed}: <strong>${dollars(Math.max(0, owedCents))}</strong></p>
          {state.status === 'error' && <p className="split-error" role="alert">{dictionary[state.message as 'invalidSplit' | 'saveSplitFailed']}</p>}
          <div className="split-actions">
            <button className="button" onClick={() => dialog.current?.close()} type="button">{dictionary.cancel}</button>
            <button className="button button-primary" disabled={isPending} type="submit">{dictionary.save}</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
