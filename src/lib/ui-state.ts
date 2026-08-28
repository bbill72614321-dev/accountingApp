export function isCurrentNavigationPath(pathname: string, href: string) {
  return pathname === href
}

export function canDeleteTransaction(source: string) {
  return source === 'manual'
}
