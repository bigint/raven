'use client'

import { useSession } from '@/lib/auth-client'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview' },
  { href: '/providers', label: 'Providers' },
  { href: '/keys', label: 'Keys' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/requests', label: 'Requests' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/settings', label: 'Settings' },
] as const

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <div className="mb-6 text-lg font-bold">Raven</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
