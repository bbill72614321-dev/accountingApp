import Link from 'next/link'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/settings', label: 'Settings' },
]

export function AppNav() {
  return (
    <nav aria-label="Main navigation" className="flex w-full justify-around border-y py-2 md:w-48 md:flex-col md:justify-start md:gap-1 md:border-y-0 md:border-r md:py-0 md:pr-4">
      {links.map((link) => (
        <Link className="rounded px-3 py-2 text-sm hover:bg-zinc-100" href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
