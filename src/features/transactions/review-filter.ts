export type ReviewFilter = 'all' | 'unreviewed'

export function filterReportRowsByReview<T extends { user_reviewed_at?: string | null }>(
  rows: readonly T[],
  filter: ReviewFilter,
): T[] {
  return filter === 'unreviewed' ? rows.filter((row) => !row.user_reviewed_at) : [...rows]
}
