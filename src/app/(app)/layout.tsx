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
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-b p-4 md:min-h-screen md:border-b-0 md:border-r">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="truncate text-sm text-zinc-600">{user.email}</p>
          <form action={logout}>
            <button className="shrink-0 text-sm underline" type="submit">{dictionary.signOut}</button>
          </form>
        </div>
        <AppNav dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} language={language} />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
