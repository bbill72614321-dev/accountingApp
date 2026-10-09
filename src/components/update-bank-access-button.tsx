'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink } from 'react-plaid-link'

export function UpdateBankAccessButton({
  itemId,
  label,
  loadingLabel,
  successLabel,
  errorLabel,
}: {
  itemId: string
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
        setSuccess(true)
        setMessage(successLabel)
        router.refresh()
      } catch {
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
    {displayMessage && <p className={success && !linkError ? 'bank-access-success' : 'bank-access-error'} role={success && !linkError ? 'status' : 'alert'}>{displayMessage}</p>}
  </div>
}
