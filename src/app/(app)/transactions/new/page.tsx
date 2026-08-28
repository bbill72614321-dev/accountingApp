import { createManualTransaction } from '@/app/actions/transactions'
import { ManualTransactionForm } from '@/components/manual-transaction-form'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function NewTransactionPage() {
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  return (
    <section className="console-page entry-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEDGER / NEW</span>
          <h1>{dictionary.newTransaction}</h1>
        </div>
      </div>
      <ManualTransactionForm action={createManualTransaction} language={language} labels={dictionary} />
    </section>
  )
}
