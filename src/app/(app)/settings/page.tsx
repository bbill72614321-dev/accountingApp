import { deleteMerchantRule } from '@/app/actions/transactions'
import { CATEGORY_LABELS, type Category } from '@/features/transactions/categories'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getDictionary, getLanguage } from '@/lib/i18n'

export default async function SettingsPage() {
  const user = await requireUser()
  const language = await getLanguage()
  const dictionary = getDictionary(language)
  const supabase = await createServerClient()
  const { data: rules, error } = await supabase.from('merchant_rules').select('id, normalized_merchant, category')
    .eq('user_id', user.id).order('normalized_merchant')
  if (error) throw new Error('Unable to load merchant rules')

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">{dictionary.settings}</h1>
      <h2 className="mb-2 text-lg font-medium">{dictionary.merchantRules}</h2>
      {!rules?.length ? <p>{dictionary.noMerchantRules}</p> : (
        <ul className="grid gap-2">
          {rules.map((rule) => (
            <li className="flex items-center gap-3" key={rule.id}>
              <span>{rule.normalized_merchant}: {CATEGORY_LABELS[rule.category as Category][language]}</span>
              <form action={deleteMerchantRule}>
                <input name="rule_id" type="hidden" value={rule.id} />
                <button type="submit">{dictionary.delete}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
