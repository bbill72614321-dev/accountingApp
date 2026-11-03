'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink } from 'react-plaid-link'
import { BankAccountChanges, type BankAccessAccount } from './bank-account-access'
import { compareAccountAccess, type AccountAccessSnapshot, type AccountAccessChanges } from '@/features/plaid/account-access'
import type { PlaidProviderAccount } from '@/features/plaid/sync-owned-item'
import type { Dictionary } from '@/lib/i18n'

export function UpdateBankAccessButton({
  itemId,
  accounts,
  snapshot,
  dictionary,
  label,
  loadingLabel,
  successLabel,
  errorLabel,
}: {
  itemId: string
  accounts: BankAccessAccount[]
  snapshot: AccountAccessSnapshot | null
  dictionary: Dictionary
  label: string
  loadingLabel: string
  successLabel: string
  errorLabel: string
}) {
  const router = useRouter()
  const openedToken = useRef<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const baseline = useRef<{ ids: string[] | null; accounts: BankAccessAccount[] }>({ ids: null, accounts: [] })
  const [report, setReport] = useState<{ changes: AccountAccessChanges | null; accounts: BankAccessAccount[] } | null>(null)

  const { open, ready, error: linkError } = usePlaidLink({
    token,
    onSuccess: async () => {
      setPending(true)
      try {
        const response = await fetch('/api/plaid/update-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        })
        if (!response.ok) throw new Error('Sync failed')
        const body: { accounts: PlaidProviderAccount[] } = await response.json()
        const known = new Map(baseline.current.accounts.map((account) => [account.plaid_account_id, account]))
        for (const account of body.accounts) {
          if (!known.has(account.accountId)) known.set(account.accountId, {
            plaid_account_id: account.accountId, name: account.name, mask: account.mask, display_name: null,
          })
        }
        setReport({ changes: compareAccountAccess(baseline.current.ids, body.accounts.map((account) => account.accountId)), accounts: [...known.values()] })
        setSuccess(true)
        setMessage(successLabel)
        router.refresh()
      } catch {
        router.refresh()
        setMessage(errorLabel)
      } finally {
        setPending(false)
      }
    },
    onExit: (error) => {
      setPending(false)
      if (error) setMessage(errorLabel)
    },
  })

  useEffect(() => {
    if (token && ready && openedToken.current !== token) {
      openedToken.current = token
      open()
    }
  }, [token, ready, open])

  async function beginUpdate() {
    setPending(true)
    setSuccess(false)
    setMessage(null)
    setReport(null)
    // Capture before Link opens: a webhook may refresh stored access before onSuccess runs.
    baseline.current = { ids: snapshot?.accountIds ?? null, accounts }
    try {
      const response = await fetch('/api/plaid/update-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!response.ok) throw new Error('Link failed')
      const body: { linkToken?: string } = await response.json()
      if (!body.linkToken) throw new Error('Missing Link token')
      setToken(body.linkToken)
    } catch {
      setMessage(errorLabel)
      setPending(false)
    }
  }

  const displayMessage = token && linkError ? errorLabel : message
  const isPending = pending && !(token && linkError)

  return <div className="bank-access-action">
    <button className="button" disabled={isPending} onClick={beginUpdate} type="button">{isPending ? loadingLabel : label}</button>
    {report && <BankAccountChanges changes={report.changes} accounts={report.accounts} dictionary={dictionary} />}
    {displayMessage && <p className={success && !linkError ? 'bank-access-success' : 'bank-access-error'} role={success && !linkError ? 'status' : 'alert'}>{displayMessage}</p>}
  </div>
}
