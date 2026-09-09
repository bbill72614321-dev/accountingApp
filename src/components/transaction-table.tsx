import Link from 'next/link'
import {
  setTransactionIncluded,
  updateTransactionCategory,
  updateTransactionNote,
} from '@/app/actions/transactions'
import { DeleteTransactionForm } from '@/components/delete-transaction-form'
import { SplitPaymentDialog } from '@/components/split-payment-dialog'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from '@/features/transactions/categories'
import { displayedCategory } from '@/features/transactions/merchant-rule'
import { formatUsd } from '@/features/transactions/money'
import { shouldTrackReimbursement } from '@/features/transactions/split-payment'
import { canIncludeTransaction, canUseIncomeCategory } from '@/features/transactions/validation'
import type { Dictionary } from '@/lib/i18n'
import { canDeleteTransaction, canEditTransaction, transactionCategoryFieldKey, transactionSourceLabel, transactionStatus } from '@/lib/ui-state'

export type TransactionRow = {
  id: string
  raw_description: string | null
  source_category: Category | null
  category_override: Category | null
  transaction_date: string
  amount_cents: number
  note: string
  include_in_report: boolean
  source: string
  pending: boolean
  provider_pending?: boolean
  review_status?: 'confirmed' | 'needs_review'
  bank_account?: {
    name: string
    mask: string | null
  } | null
  transaction_split?: {
    split_count: number
    personal_amount_cents: number
    requested_at: string | null
  } | null
}

export function TransactionTable({ rows, language = 'en', dictionary }: { rows: TransactionRow[]; language?: Language; dictionary: Dictionary }) {
  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead>
          <tr><th>{dictionary.merchant}</th><th>{dictionary.category}</th><th>{dictionary.date}</th><th>{dictionary.amount}</th><th>{dictionary.note}</th><th>{dictionary.status}</th><th>{dictionary.edit}</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const category = displayedCategory({
              sourceCategory: row.source_category, categoryOverride: row.category_override,
            })
            const amount = `${row.amount_cents < 0 ? '−' : '+'}${formatUsd(Math.abs(row.amount_cents), language)}`
            const canInclude = canIncludeTransaction({ amountCents: row.amount_cents, category })
            return (
              <tr className={row.include_in_report ? 'ledger-row-included' : undefined} key={row.id}>
                <td className="ledger-merchant" data-label={dictionary.merchant}>
                  <strong>{row.raw_description || '—'}</strong>
                  <span className="source-label">{dictionary[transactionSourceLabel(row.source)]}</span>
                  {row.bank_account && <span className="transaction-account-label">{row.bank_account.name}{row.bank_account.mask ? ` · ${row.bank_account.mask}` : ''}</span>}
                  {row.transaction_split && shouldTrackReimbursement(Math.abs(row.amount_cents), row.transaction_split.personal_amount_cents) && (
                    <span className="split-summary">{dictionary.yourShare}: {formatUsd(row.transaction_split.personal_amount_cents, language)}</span>
                  )}
                </td>
                <td data-label={dictionary.category}>
                  <form action={updateTransactionCategory} className="ledger-inline-form">
                    <input name="transaction_id" type="hidden" value={row.id} />
                    <label className="sr-only" htmlFor={`category-${row.id}`}>{dictionary.category}</label>
                    <select defaultValue={category ?? ''} id={`category-${row.id}`} key={transactionCategoryFieldKey(row.id, category)} name="category">
                      {canUseIncomeCategory(row.amount_cents)
                        ? <option value="">{dictionary.noSpendingCategory}</option>
                        : <option disabled value="">{dictionary.chooseCategory}</option>}
                      {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>)}
                    </select>
                    <button className="ledger-button" type="submit">{dictionary.save}</button>
                  </form>
                </td>
                <td data-label={dictionary.date}>{row.transaction_date}</td>
                <td aria-label={amount} className={row.amount_cents < 0 ? 'amount-outgoing' : 'amount-incoming'} data-label={dictionary.amount}>{amount}</td>
                <td data-label={dictionary.note}>
                  <form action={updateTransactionNote} className="ledger-inline-form">
                    <input name="transaction_id" type="hidden" value={row.id} />
                    <label className="sr-only" htmlFor={`note-${row.id}`}>{dictionary.note}</label>
                    <input defaultValue={row.note} id={`note-${row.id}`} maxLength={1000} name="note" />
                    <button className="ledger-button" type="submit">{dictionary.save}</button>
                  </form>
                </td>
                <td data-label={dictionary.status}>
                  {row.source === 'plaid' && row.provider_pending
                    ? <span className="status-label is-pending">{dictionary.bankPending}</span>
                    : <span className={`status-label ${row.pending ? 'is-pending' : ''}`}>{dictionary[transactionStatus(row.pending)]}</span>}
                </td>
                <td data-label={dictionary.edit}>
                  <div className="ledger-actions">
                    <form action={setTransactionIncluded}>
                      <input name="transaction_id" type="hidden" value={row.id} />
                      <button className="ledger-button ledger-report-toggle" disabled={!row.include_in_report && !canInclude} name="included" type="submit" value={String(!row.include_in_report)}>
                        {row.include_in_report ? dictionary.excludeFromReport : dictionary.includeInReport}
                      </button>
                    </form>
                    {row.amount_cents < 0 && <SplitPaymentDialog amountCents={row.amount_cents} dictionary={dictionary} split={row.transaction_split} transactionId={row.id} />}
                    {canEditTransaction(row.source) && <Link className="ledger-button" href={`/transactions/${row.id}/edit`}>{dictionary.edit}</Link>}
                    {canDeleteTransaction(row.source) && (
                      <DeleteTransactionForm confirmation={dictionary.deleteConfirmation} label={dictionary.delete} transactionId={row.id} />
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
