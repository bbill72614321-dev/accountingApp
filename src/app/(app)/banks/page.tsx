import { BankAccountAccess, type BankAccessAccount } from '@/components/bank-account-access'
import type { AccountAccessSnapshot } from '@/features/plaid/account-access'
import { ConnectBankButton } from '@/components/connect-bank-button'
import { DisconnectBankForm } from '@/components/disconnect-bank-form'
import { UpdateBankAccessButton } from '@/components/update-bank-access-button'
import { requireUser } from '@/lib/auth'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { createServerClient } from '@/lib/supabase/server'

export default async function BanksPage() {
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('bank_items').select('id, institution_name, status, last_synced_at, account_access_snapshot, bank_accounts(plaid_account_id, name, display_name, mask)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load bank connections')
  return (
    <section className="console-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONNECTIONS / PLAID</span>
          <h1>{dictionary.bankConnections}</h1>
          <p className="muted">{dictionary.bankConnectionsDescription}</p>
          <p className="muted">{dictionary.accountSelectionHint}</p>
        </div>
        <ConnectBankButton label={dictionary.connectBank} />
      </div>
      <div className="settings-list">
        {(data ?? []).map((item) => (
          <article className="settings-row bank-connection" key={item.id}>
            <div>
              <strong>{item.institution_name}</strong>
              <span>{item.status}</span>
              <small>{item.last_synced_at ?? 'Not synced yet'}</small>
            </div>
            <div className="settings-row-actions">
              <UpdateBankAccessButton
                itemId={item.id}
                accounts={item.bank_accounts as BankAccessAccount[]}
                snapshot={item.account_access_snapshot as AccountAccessSnapshot | null}
                dictionary={dictionary}
                label={dictionary.updateAccountAccess}
                loadingLabel={dictionary.updatingAccountAccess}
                successLabel={dictionary.accountAccessUpdated}
                errorLabel={dictionary.updateAccountAccessError}
              />
              <DisconnectBankForm
                confirmationTemplate={dictionary.disconnectBankConfirmation}
                errorLabel={dictionary.disconnectBankError}
                institution={item.institution_name}
                itemId={item.id}
                label={dictionary.disconnectBank}
              />
            </div>
            <BankAccountAccess accounts={item.bank_accounts as BankAccessAccount[]} snapshot={item.account_access_snapshot as AccountAccessSnapshot | null} dictionary={dictionary} language={language} />
          </article>
        ))}
        {data?.length === 0 && <p>{dictionary.noBankConnections}</p>}
      </div>
    </section>
  )
}
