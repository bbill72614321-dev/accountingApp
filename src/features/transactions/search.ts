export function searchTransactions<T extends { raw_description: string | null; note: string | null }>(rows: T[], query: string): T[] {
  const text = query.trim().toLowerCase()
  return rows.filter((row) => !text || (row.raw_description ?? '').toLowerCase().includes(text) || (row.note ?? '').toLowerCase().includes(text))
}

export function searchSpending(rows: Array<{ amount_cents: number; transaction_split?: { personal_amount_cents: number } | null }>) {
  return rows.reduce((total, row) => {
    if (row.amount_cents >= 0) return total
    total.original += Math.abs(row.amount_cents)
    total.personal += row.transaction_split?.personal_amount_cents ?? Math.abs(row.amount_cents)
    total.hasSplit ||= !!row.transaction_split
    return total
  }, { original: 0, personal: 0, hasSplit: false })
}
