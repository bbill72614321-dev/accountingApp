import type { Category } from './categories'

export function displayedCategory(input: {
  sourceCategory: Category | null
  categoryOverride: Category | null
}): Category | null {
  return input.categoryOverride ?? input.sourceCategory
}

export function effectiveCategoryFilter(category: Category): string {
  return `category_override.eq."${category}",and(category_override.is.null,source_category.eq."${category}")`
}
