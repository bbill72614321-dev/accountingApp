'use client'

import { useState, useTransition } from 'react'
import { setLanguage } from '@/app/actions/preferences'
import type { Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

export function LanguageSwitcher({ language, dictionary }: { language: Language; dictionary: Dictionary }) {
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleLanguageChange(value: Language) {
    setSelectedLanguage(value)
    setMessage('')
    startTransition(async () => {
      try {
        await setLanguage(value)
        window.location.reload()
      } catch {
        setSelectedLanguage(language)
        setMessage(dictionary.updateLanguageFailed)
      }
    })
  }

  return (
    <div className="language-switcher">
      <label htmlFor="app-language">{dictionary.language}</label>
      <select value={selectedLanguage} id="app-language" name="language" disabled={isPending} onChange={(event) => handleLanguageChange(event.currentTarget.value as Language)}>
        <option value="zh-TW">{dictionary.traditionalChinese}</option>
        <option value="en">{dictionary.english}</option>
      </select>
      {message ? <p className="language-switcher-status" role="status">{message}</p> : null}
    </div>
  )
}
