'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Dictionary } from '@/lib/i18n'
import { isCurrentNavigationPath } from '@/lib/ui-state'

const links = [
  { href: '/dashboard', key: 'dashboard' as const },
  { href: '/transactions', key: 'transactions' as const },
  { href: '/banks', key: 'bankConnections' as const },
  { href: '/settings', key: 'settings' as const },
]

export function AppNav({ dictionary }: { dictionary: Dictionary }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Main navigation" className="app-nav">
      {links.map((link) => (
        <Link aria-current={isCurrentNavigationPath(pathname, link.href) ? 'page' : undefined} className={`app-nav-link ${isCurrentNavigationPath(pathname, link.href) ? 'is-active' : ''}`} href={link.href} key={link.href}>
          {dictionary[link.key]}
        </Link>
      ))}
    </nav>
  )
}
