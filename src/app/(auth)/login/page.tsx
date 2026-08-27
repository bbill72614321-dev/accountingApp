import { LoginForm } from '@/components/login-form'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function LoginPage() {
  const dictionary = getDictionary(await getLanguage())
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-10 p-6">
      <section>
        <h1 className="text-3xl font-semibold">{dictionary.login}</h1>
      </section>
      <LoginForm dictionary={dictionary} />
    </main>
  )
}
