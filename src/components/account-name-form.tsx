'use client'

import { useActionState } from 'react'
import { renameBankAccount, type AccountNameState } from '@/app/actions/account-names'
import type { Dictionary } from '@/lib/i18n'

const initialState: AccountNameState = { status: 'idle' }

export function AccountNameForm({ account, dictionary }: {
  account: { id: string; name: string; mask: string | null; display_name: string | null }
  dictionary: Dictionary
}) {
  const [state, action, pending] = useActionState(renameBankAccount, initialState)
  return (
    <form action={action} className="account-name-form">
      <input type="hidden" name="account_id" value={account.id} />
      <label htmlFor={`account-name-${account.id}`}>
        {account.name}{account.mask ? ` · ${account.mask}` : ''}
      </label>
      <div className="account-name-controls">
        <input id={`account-name-${account.id}`} name="display_name" defaultValue={account.display_name ?? ''}
          maxLength={60} placeholder={dictionary.accountDisplayName} disabled={pending} />
        <button className="ledger-button" type="submit" disabled={pending}>{dictionary.save}</button>
      </div>
      {state.status === 'success' && <p role="status">{dictionary.accountNameSaved}</p>}
      {state.status === 'error' && <p role="alert">{dictionary.accountNameError}</p>}
    </form>
  )
}
