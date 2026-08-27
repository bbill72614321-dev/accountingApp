import type { Category } from './categories'

export function displayedCategory(input: {
  sourceCategory: Category | null
  categoryOverride: Category | null
}): Category | null {
  return input.categoryOverride ?? input.sourceCategory
}
