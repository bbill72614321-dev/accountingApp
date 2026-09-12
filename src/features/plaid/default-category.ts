import type { Category } from '@/features/transactions/categories'

export type MerchantCategoryRule = {
  normalizedMerchant: string
  category: Category
}

function normalizeMerchant(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function defaultCategoryForMerchant(
  merchant: string,
  rules: readonly MerchantCategoryRule[],
): Category | null {
  const normalizedMerchant = normalizeMerchant(merchant)
  return rules.find((rule) => normalizeMerchant(rule.normalizedMerchant) === normalizedMerchant)?.category ?? null
}
