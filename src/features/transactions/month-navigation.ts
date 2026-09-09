export function availableMonths(transactionDates: readonly string[], currentMonth: string) {
  return [...new Set([currentMonth, ...transactionDates.map((date) => date.slice(0, 7))])]
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    .sort((left, right) => right.localeCompare(left))
}

export function adjacentMonth(months: readonly string[], month: string, direction: 'newer' | 'older') {
  const index = months.indexOf(month)
  if (index === -1) return null
  return months[index + (direction === 'newer' ? -1 : 1)] ?? null
}
