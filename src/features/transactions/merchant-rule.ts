import type { Category } from './categories'

export type CategoryFilter = Category | 'Uncategorized'

export function displayedCategory(input: {
  sourceCategory: Category | null
  categoryOverride: Category | null
}): Category | null {
  return input.categoryOverride ?? input.sourceCategory
}

export function effectiveCategoryFilter(category: CategoryFilter): string {
  if (category === 'Uncategorized') {
    return 'and(category_override.is.null,source_category.is.null,amount_cents.lt.0)'
  }
  return `category_override.eq."${category}",and(category_override.is.null,source_category.eq."${category}")`
}
