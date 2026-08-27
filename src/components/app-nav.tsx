import Link from 'next/link'
import type { Dictionary } from '@/lib/i18n'

const links = [
  { href: '/dashboard', key: 'dashboard' as const },
  { href: '/transactions', key: 'transactions' as const },
  { href: '/settings', key: 'settings' as const },
]

export function AppNav({ dictionary }: { dictionary: Dictionary }) {
  return (
    <nav aria-label="Main navigation" className="flex w-full justify-around border-y py-2 md:w-48 md:flex-col md:justify-start md:gap-1 md:border-y-0 md:border-r md:py-0 md:pr-4">
      {links.map((link) => (
        <Link className="rounded px-3 py-2 text-sm hover:bg-zinc-100" href={link.href} key={link.href}>
          {dictionary[link.key]}
        </Link>
      ))}
    </nav>
  )
}
