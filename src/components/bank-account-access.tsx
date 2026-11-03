import type { Dictionary } from '@/lib/i18n'
import type { Language } from '@/features/transactions/categories'
import type { AccountAccessChanges, AccountAccessSnapshot } from '@/features/plaid/account-access'

export type BankAccessAccount = { plaid_account_id: string; name: string; display_name: string | null; mask: string | null }

function accountLabel(account: BankAccessAccount) {
  return `${account.display_name || account.name}${account.mask ? ` · ••${account.mask}` : ''}`
}

export function BankAccountAccess({ accounts, snapshot, dictionary, language }: {
  accounts: BankAccessAccount[]
  snapshot: AccountAccessSnapshot | null
  dictionary: Dictionary
  language: Language
}) {
  const authorized = new Set(snapshot?.accountIds)
  return <section className="bank-account-access" aria-label={dictionary.bankAccounts}>
    <h2>{dictionary.bankAccounts}{snapshot ? ` · ${snapshot.accountIds.length}` : ''}</h2>
    {snapshot ? <p className="muted">{dictionary.accessLastChecked}: <time dateTime={snapshot.checkedAt}>
      {new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(snapshot.checkedAt))} UTC
    </time></p> : <p className="muted">{dictionary.accessUnknownHelp}</p>}
    {snapshot?.accountIds.length === 0 && <p className="bank-access-warning">{dictionary.noAuthorizedAccounts}</p>}
    <ul className="bank-account-list">
      {accounts.map((account) => {
        const status = !snapshot ? 'unknown' : authorized.has(account.plaid_account_id) ? 'authorized' : 'missing'
        return <li key={account.plaid_account_id}>
          <span>{accountLabel(account)}</span>
          <span className={`bank-account-status is-${status}`}>
            {status === 'unknown' ? dictionary.accessUnknown : status === 'authorized' ? dictionary.accessAuthorized : dictionary.accessMissing}
          </span>
        </li>
      })}
    </ul>
    {snapshot && accounts.some((account) => !authorized.has(account.plaid_account_id)) && <p className="muted">{dictionary.accessMissingHelp}</p>}
  </section>
}

export function BankAccountChanges({ changes, accounts, dictionary }: {
  changes: AccountAccessChanges | null
  accounts: BankAccessAccount[]
  dictionary: Dictionary
}) {
  if (!changes) return <p className="muted">{dictionary.accessBaselineCreated}</p>
  const groups = [
    { label: dictionary.accessAdded, ids: changes.added },
    { label: dictionary.accessRetained, ids: changes.retained },
    { label: dictionary.accessRemoved, ids: changes.removed },
  ]
  return <section className="bank-access-changes" aria-label={dictionary.accessChanges}>
    <h3>{dictionary.accessChanges}</h3>
    {groups.map(({ label, ids }) => <div key={label}>
      <strong>{label} · {ids.length}</strong>
      {ids.length > 0 && <ul>{ids.map((id) => {
        const account = accounts.find((candidate) => candidate.plaid_account_id === id)
        return <li key={id}>{account ? accountLabel(account) : dictionary.unnamedAccount}</li>
      })}</ul>}
    </div>)}
  </section>
}
