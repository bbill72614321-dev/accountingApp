import { ResetPasswordForm } from '@/components/reset-password-form'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function ResetPasswordPage() {
  const dictionary = getDictionary(await getLanguage())
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">{dictionary.resetPassword}</h1>
      <ResetPasswordForm dictionary={dictionary} />
    </main>
  )
}
