'use client'

import { api, setOrgId } from '@/lib/api'
import { signOut, useSession } from '@/lib/auth-client'
import {
  BarChart3,
  CreditCard,
  Key,
  LayoutDashboard,
  LogOut,
  Network,
  Receipt,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/providers', label: 'Providers', icon: Network },
  { href: '/keys', label: 'Keys', icon: Key },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/requests', label: 'Requests', icon: ScrollText },
  { href: '/budgets', label: 'Budgets', icon: CreditCard },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const [orgReady, setOrgReady] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const resolveOrg = async () => {
      try {
        const orgs = await api.get<{ id: string; name: string }[]>('/v1/user/orgs')
        if (orgs?.length > 0) {
          setOrgId(orgs[0]!.id)
        }
      } catch {
        // Org endpoint may not exist yet — try to continue without
      }
      setOrgReady(true)
    }
    if (session?.user) {
      resolveOrg()
    }
  }, [session?.user])

  if (isPending || (!orgReady && session)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    redirect('/sign-in')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r border-border bg-muted/50 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">R</span>
          </div>
          <span className="font-semibold">Raven</span>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {session.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  )
}
