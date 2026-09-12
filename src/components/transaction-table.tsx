import Link from 'next/link'
import {
  setTransactionExcluded,
  updateTransactionNote,
} from '@/app/actions/transactions'
import { DeleteTransactionForm } from '@/components/delete-transaction-form'
import { SplitPaymentDialog } from '@/components/split-payment-dialog'
import { TransactionCategorySelect } from '@/components/transaction-category-select'
import { TransactionReviewedToggle } from '@/components/transaction-reviewed-toggle'
import { type Category, type Language } from '@/features/transactions/categories'
import { displayedCategory } from '@/features/transactions/merchant-rule'
import { formatUsd } from '@/features/transactions/money'
import { shouldTrackReimbursement } from '@/features/transactions/split-payment'
import type { Dictionary } from '@/lib/i18n'
import { canDeleteTransaction, canEditTransaction, transactionReportDisposition, transactionSourceLabel, transactionStatus } from '@/lib/ui-state'

export type TransactionRow = {
  id: string
  raw_description: string | null
  source_category: Category | null
  category_override: Category | null
  transaction_date: string
  amount_cents: number
  note: string
  include_in_report: boolean
  excluded_from_report: boolean
  source: string
  pending: boolean
  provider_pending?: boolean
  review_status?: 'confirmed' | 'needs_review'
  user_reviewed_at?: string | null
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
            const reportDisposition = transactionReportDisposition({ included: row.include_in_report, excluded: row.excluded_from_report })
            return (
              <tr className={reportDisposition === 'excluded' ? 'ledger-row-resolved' : undefined} key={row.id}>
                <td className="ledger-merchant" data-label={dictionary.merchant}>
                  <strong>{row.raw_description || '—'}</strong>
                  <span className="source-label">{dictionary[transactionSourceLabel(row.source)]}</span>
                  {row.bank_account && <span className="transaction-account-label">{row.bank_account.name}{row.bank_account.mask ? ` · ${row.bank_account.mask}` : ''}</span>}
                  {row.transaction_split && shouldTrackReimbursement(Math.abs(row.amount_cents), row.transaction_split.personal_amount_cents) && (
                    <span className="split-summary">{dictionary.yourShare}: {formatUsd(row.transaction_split.personal_amount_cents, language)}</span>
                  )}
                </td>
                <td data-label={dictionary.category}>
                  <TransactionCategorySelect category={category} dictionary={dictionary} language={language} transactionId={row.id} />
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
                    : reportDisposition === 'excluded'
                      ? <span className="status-label">{dictionary.skipped}</span>
                      : <span className={`status-label ${row.pending ? 'is-pending' : ''}`}>{dictionary[transactionStatus(row.pending)]}</span>}
                </td>
                <td data-label={dictionary.edit}>
                  <div className="ledger-actions">
                    <TransactionReviewedToggle dictionary={dictionary} reviewedAt={row.user_reviewed_at} transactionId={row.id} />
                    {reportDisposition === 'excluded' ? (
                      <form action={setTransactionExcluded}>
                        <input name="transaction_id" type="hidden" value={row.id} />
                        <button className="ledger-button ledger-report-toggle" name="excluded" type="submit" value="false">{dictionary.undoSkip}</button>
                      </form>
                    ) : (
                      <form action={setTransactionExcluded}>
                        <input name="transaction_id" type="hidden" value={row.id} />
                        <button className="ledger-button" name="excluded" type="submit" value="true">{dictionary.skipFromReport}</button>
                      </form>
                    )}
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
