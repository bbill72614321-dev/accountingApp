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
        <p className="truncate text-sm text-zinc-600">{user.email}</p>
        <AppNav dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} language={language} />
        <form action={logout} className="mt-4 md:mt-auto">
          <button className="text-sm underline" type="submit">{dictionary.signOut}</button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
