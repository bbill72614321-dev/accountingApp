'use client'

import { useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { responseErrorMessage } from '@/lib/http'

export function ConnectBankButton({ label }: { label: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/plaid/link-token', { method: 'POST' }).then(async (response) => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setToken(body.linkToken)
    }).catch((error: Error) => setMessage(error.message))
  }, [])
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (publicToken) => {
      const response = await fetch('/api/plaid/exchange', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicToken }),
      })
      if (!response.ok) setMessage(await responseErrorMessage(response, 'Unable to connect bank'))
      else window.location.reload()
    },
  })
  return <><button className="button button-primary" disabled={!ready || Boolean(message)} onClick={() => open()} type="button">{label}</button>{message && <p role="alert">{message}</p>}</>
}
