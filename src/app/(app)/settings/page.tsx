import { deleteMerchantRule } from '@/app/actions/transactions'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const user = await requireUser()
  const supabase = await createServerClient()
  const { data: rules, error } = await supabase.from('merchant_rules').select('id, normalized_merchant, category')
    .eq('user_id', user.id).order('normalized_merchant')
  if (error) throw new Error('Unable to load merchant rules')

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <h2 className="mb-2 text-lg font-medium">Learned merchant categories</h2>
      {!rules?.length ? <p>No learned merchant categories yet.</p> : (
        <ul className="grid gap-2">
          {rules.map((rule) => (
            <li className="flex items-center gap-3" key={rule.id}>
              <span>{rule.normalized_merchant}: {rule.category}</span>
              <form action={deleteMerchantRule}>
                <input name="rule_id" type="hidden" value={rule.id} />
                <button type="submit">Delete rule</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
