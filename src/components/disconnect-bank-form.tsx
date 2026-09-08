'use client'

import { useActionState } from 'react'
import { disconnectBankItem, initialDisconnectBankActionState } from '@/app/actions/banks'
import { disconnectConfirmation } from '@/components/disconnect-confirmation'

export function DisconnectBankForm({
  itemId,
  institution,
  label,
  confirmationTemplate,
  errorLabel,
}: {
  itemId: string
  institution: string
  label: string
  confirmationTemplate: string
  errorLabel: string
}) {
  const [state, formAction, pending] = useActionState(disconnectBankItem, initialDisconnectBankActionState)

  return (
    <form action={formAction} className="settings-row-actions" onSubmit={(event) => {
      if (!window.confirm(disconnectConfirmation(institution, confirmationTemplate))) event.preventDefault()
    }}>
      <input name="bank_item_id" type="hidden" value={itemId} />
      <button className="ledger-button ledger-delete" disabled={pending} type="submit">{label}</button>
      {state.status === 'error' && <p role="alert">{errorLabel}</p>}
    </form>
  )
}
