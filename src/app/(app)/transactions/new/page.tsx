import { createManualTransaction } from '@/app/actions/transactions'
import { ManualTransactionForm } from '@/components/manual-transaction-form'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function NewTransactionPage() {
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">{dictionary.newTransaction}</h1>
      <ManualTransactionForm action={createManualTransaction} language={language} labels={dictionary} />
    </>
  )
}
