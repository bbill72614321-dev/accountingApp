import type { ReactNode } from 'react'
import { logout } from '@/app/actions/auth'
import { AppNav } from '@/components/app-nav'
import { LanguageSwitcher } from '@/components/language-switcher'
import { requireUser } from '@/lib/auth'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="app-brand" aria-label="Ledger">
          <span className="app-brand-mark" aria-hidden="true">L</span>
          <span>Ledger</span>
        </div>
        <div className="app-account">
          <span className="account-label">ACCOUNT</span>
          <p className="truncate">{user.email}</p>
          <form action={logout}>
            <button className="account-signout" type="submit">{dictionary.signOut}</button>
          </form>
        </div>
        <AppNav dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} language={language} />
      </aside>
      <main className="app-main">{children}</main>
    </div>
  )
}
