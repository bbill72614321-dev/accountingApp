export function isCurrentNavigationPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function canDeleteTransaction(source: string) {
  return source === 'manual'
}

export function transactionStatus(pending: boolean) {
  return pending ? 'needsReview' : 'ready'
}

export function isPendingFilter(value: string | undefined) {
  return value === 'pending'
}

export function transactionSourceLabel(source: string) {
  return source === 'manual' ? 'manual' : 'imported'
}
