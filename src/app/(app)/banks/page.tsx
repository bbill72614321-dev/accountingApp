import { ConnectBankButton } from '@/components/connect-bank-button'
import { requireUser } from '@/lib/auth'
import { getDictionary, getLanguage } from '@/lib/i18n'
import { createServerClient } from '@/lib/supabase/server'

export default async function BanksPage() {
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('bank_items').select('id, institution_name, status, last_synced_at').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load bank connections')
  return <section className="console-page"><div className="page-heading"><div><span className="eyebrow">CONNECTIONS / PLAID</span><h1>{dictionary.bankConnections}</h1><p className="muted">{dictionary.bankConnectionsDescription}</p></div><ConnectBankButton label={dictionary.connectBank} /></div><div className="settings-list">{(data ?? []).map((item) => <article className="settings-row" key={item.id}><strong>{item.institution_name}</strong><span>{item.status}</span><small>{item.last_synced_at ?? 'Not synced yet'}</small></article>)}{data?.length === 0 && <p>{dictionary.noBankConnections}</p>}</div></section>
}
