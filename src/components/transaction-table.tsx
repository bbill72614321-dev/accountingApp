import Link from 'next/link'
import {
  setTransactionIncluded,
  updateTransactionCategory,
  updateTransactionNote,
} from '@/app/actions/transactions'
import { DeleteTransactionForm } from '@/components/delete-transaction-form'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from '@/features/transactions/categories'
import { displayedCategory } from '@/features/transactions/merchant-rule'
import { formatUsd } from '@/features/transactions/money'
import type { Dictionary } from '@/lib/i18n'
import { canDeleteTransaction, transactionSourceLabel, transactionStatus } from '@/lib/ui-state'

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
}

export function TransactionTable({ rows, language = 'en', dictionary }: { rows: TransactionRow[]; language?: Language; dictionary: Dictionary }) {
  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead>
          <tr><th>{dictionary.merchant}</th><th>{dictionary.category}</th><th>{dictionary.date}</th><th>{dictionary.amount}</th><th>{dictionary.note}</th><th>{dictionary.needsReview}</th><th>{dictionary.edit}</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const category = displayedCategory({
              sourceCategory: row.source_category, categoryOverride: row.category_override,
            })
            const amount = `${row.amount_cents < 0 ? '−' : '+'}${formatUsd(Math.abs(row.amount_cents), language)}`
            return (
              <tr key={row.id}>
                <td className="ledger-merchant" data-label={dictionary.merchant}>
                  <strong>{row.raw_description || '—'}</strong>
                  <span className="source-label">{dictionary[transactionSourceLabel(row.source)]}</span>
                </td>
                <td data-label={dictionary.category}>
                  <form action={updateTransactionCategory} className="ledger-inline-form">
                    <input name="transaction_id" type="hidden" value={row.id} />
                    <label className="sr-only" htmlFor={`category-${row.id}`}>{dictionary.category}</label>
                    <select defaultValue={category ?? ''} id={`category-${row.id}`} name="category">
                      <option disabled value="">{dictionary.noSpendingCategory}</option>
                      {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>)}
                    </select>
                    <button type="submit">{dictionary.save}</button>
                  </form>
                </td>
                <td data-label={dictionary.date}>{row.transaction_date}</td>
                <td aria-label={amount} className={row.amount_cents < 0 ? 'amount-outgoing' : 'amount-incoming'} data-label={dictionary.amount}>{amount}</td>
                <td data-label={dictionary.note}>
                  <form action={updateTransactionNote} className="ledger-inline-form">
                    <input name="transaction_id" type="hidden" value={row.id} />
                    <label className="sr-only" htmlFor={`note-${row.id}`}>{dictionary.note}</label>
                    <input defaultValue={row.note} id={`note-${row.id}`} maxLength={1000} name="note" />
                    <button type="submit">{dictionary.save}</button>
                  </form>
                </td>
                <td data-label={dictionary.needsReview}>
                  <span className={`status-label ${row.pending ? 'is-pending' : ''}`}>{dictionary[transactionStatus(row.pending)]}</span>
                </td>
                <td data-label={dictionary.edit}>
                  <div className="ledger-actions">
                    <span>{row.include_in_report ? dictionary.included : dictionary.excluded}</span>
                    <form action={setTransactionIncluded}>
                      <input name="transaction_id" type="hidden" value={row.id} />
                      <button name="included" type="submit" value={String(!row.include_in_report)}>
                        {row.include_in_report ? dictionary.excluded : dictionary.included}
                      </button>
                    </form>
                    <Link href={`/transactions/${row.id}/edit`}>{dictionary.edit}</Link>
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
