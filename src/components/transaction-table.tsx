import Link from 'next/link'
import {
  setTransactionIncluded,
  updateTransactionCategory,
  updateTransactionNote,
} from '@/app/actions/transactions'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Language } from '@/features/transactions/categories'
import { displayedCategory } from '@/features/transactions/merchant-rule'
import { formatUsd } from '@/features/transactions/money'
import type { Dictionary } from '@/lib/i18n'

export type TransactionRow = {
  id: string
  raw_description: string | null
  source_category: Category | null
  category_override: Category | null
  transaction_date: string
  amount_cents: number
  note: string
  include_in_report: boolean
}

export function TransactionTable({ rows, language = 'en', dictionary }: { rows: TransactionRow[]; language?: Language; dictionary: Dictionary }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr><th>{dictionary.merchant}</th><th>{dictionary.category}</th><th>{dictionary.date}</th><th>{dictionary.amount}</th><th>{dictionary.note}</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const category = displayedCategory({
              sourceCategory: row.source_category, categoryOverride: row.category_override,
            })
            const amount = `${row.amount_cents < 0 ? '−' : '+'}${formatUsd(Math.abs(row.amount_cents), language)}`
            return (
              <tr key={row.id}>
                <td>{row.raw_description || '—'}</td>
                <td>
                  <form action={updateTransactionCategory}>
                    <input name="transaction_id" type="hidden" value={row.id} />
                    <label className="sr-only" htmlFor={`category-${row.id}`}>{dictionary.category}</label>
                    <select defaultValue={category ?? ''} id={`category-${row.id}`} name="category">
                      <option disabled value="">{dictionary.noSpendingCategory}</option>
                      {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][language]}</option>)}
                    </select>
                    <button type="submit">{dictionary.save}</button>
                  </form>
                </td>
                <td>{row.transaction_date}</td>
                <td aria-label={amount}>{amount}</td>
                <td>
                  <form action={updateTransactionNote}>
                    <input name="transaction_id" type="hidden" value={row.id} />
                    <label className="sr-only" htmlFor={`note-${row.id}`}>{dictionary.note}</label>
                    <input defaultValue={row.note} id={`note-${row.id}`} maxLength={1000} name="note" />
                    <button type="submit">{dictionary.save}</button>
                  </form>
                  <div className="mt-2 flex gap-2 text-sm">
                    <span>{row.include_in_report ? dictionary.included : dictionary.excluded}</span>
                    <form action={setTransactionIncluded}>
                      <input name="transaction_id" type="hidden" value={row.id} />
                      <button name="included" type="submit" value={String(!row.include_in_report)}>
                        {row.include_in_report ? dictionary.excluded : dictionary.included}
                      </button>
                    </form>
                    <Link href={`/transactions/${row.id}/edit`}>{dictionary.edit}</Link>
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
