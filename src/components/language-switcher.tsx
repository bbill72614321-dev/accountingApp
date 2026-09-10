'use client'

import { setLanguage } from '@/app/actions/preferences'
import type { Language } from '@/features/transactions/categories'
import type { Dictionary } from '@/lib/i18n'

export function LanguageSwitcher({ language, dictionary }: { language: Language; dictionary: Dictionary }) {
  return (
    <form action={setLanguage} className="language-switcher">
      <label htmlFor="app-language">{dictionary.language}</label>
      <select defaultValue={language} id="app-language" name="language" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        <option value="zh-TW">{dictionary.traditionalChinese}</option>
        <option value="en">{dictionary.english}</option>
      </select>
    </form>
  )
}
