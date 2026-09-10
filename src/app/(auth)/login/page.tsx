import { LoginForm } from '@/components/login-form'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function LoginPage() {
  const dictionary = getDictionary(await getLanguage())
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>{dictionary.login}</h1>
        <p className="muted">{dictionary.personalFinanceDescription}</p>
        <div className="auth-form">
          <LoginForm dictionary={dictionary} />
        </div>
      </section>
    </main>
  )
}
