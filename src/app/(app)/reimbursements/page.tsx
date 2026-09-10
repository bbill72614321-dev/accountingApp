import { z } from 'zod'
import { markSplitRequested } from '@/app/actions/transactions'
import { MonthNavigator } from '@/components/month-navigator'
import { availableMonths } from '@/features/transactions/month-navigation'
import { owedAmountCents, shouldTrackReimbursement } from '@/features/transactions/split-payment'
import { formatUsd } from '@/features/transactions/money'
import { requireUser } from '@/lib/auth'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { createServerClient } from '@/lib/supabase/server'

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

export default async function ReimbursementsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const homeMonth = new Date().toISOString().slice(0, 7)
  const month = monthSchema.safeParse((await searchParams).month).data ?? homeMonth
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('transaction_splits').select(
    'transaction_id, split_count, personal_amount_cents, requested_at, transaction:transactions!inner(raw_description, transaction_date, amount_cents)',
  ).eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load reimbursements')

  const rows = (data ?? []).map((row) => {
    const transaction = Array.isArray(row.transaction) ? row.transaction[0] : row.transaction
    return { ...row, transaction }
  }).filter((row) => row.transaction
    && shouldTrackReimbursement(Math.abs(row.transaction.amount_cents), row.personal_amount_cents)
    && row.transaction.transaction_date.startsWith(`${month}-`))
  const months = availableMonths((data ?? []).flatMap((row) => {
    const transaction = Array.isArray(row.transaction) ? row.transaction[0] : row.transaction
    return transaction ? [transaction.transaction_date] : []
  }), homeMonth)

  return (
    <section className="console-page reimbursement-page">
      <div className="page-heading">
        <div>
          <h1>{dictionary.reimbursements}</h1>
          <p className="muted">{rows.length} {dictionary.results}</p>
        </div>
      </div>
      <MonthNavigator currentMonth={month} homeMonth={homeMonth} labels={{ current: dictionary.currentMonth, month: dictionary.month, previous: dictionary.previousMonth, next: dictionary.nextMonth }} language={language} months={months} path="/reimbursements" />
      {rows.length === 0 ? <p className="ledger-empty">{dictionary.noReimbursements}</p> : (
        <section className="reimbursement-list" aria-label={dictionary.reimbursements}>
          {rows.map((row) => {
            if (!row.transaction) return null
            const owedCents = owedAmountCents(Math.abs(row.transaction.amount_cents), row.personal_amount_cents)
            return (
              <article className={`reimbursement-row ${row.requested_at ? 'is-requested' : ''}`} key={row.transaction_id}>
                <div className="reimbursement-merchant"><strong>{row.transaction.raw_description || '—'}</strong><span>{row.transaction.transaction_date} · {row.split_count} {dictionary.people}</span></div>
                <dl className="reimbursement-amounts">
                  <div><dt>{dictionary.totalCharged}</dt><dd>{formatUsd(Math.abs(row.transaction.amount_cents), language)}</dd></div>
                  <div><dt>{dictionary.yourShare}</dt><dd>{formatUsd(row.personal_amount_cents, language)}</dd></div>
                  <div><dt>{dictionary.amountOwed}</dt><dd className="amount-incoming">{formatUsd(owedCents, language)}</dd></div>
                </dl>
                {row.requested_at ? <span className="status-label">{dictionary.requestSent}</span> : (
                  <form action={markSplitRequested}><input name="transaction_id" type="hidden" value={row.transaction_id} /><button className="ledger-button" type="submit">{dictionary.markRequested}</button></form>
                )}
              </article>
            )
          })}
        </section>
      )}
    </section>
  )
}
