'use client'

import { api, setOrgId } from '@/lib/api'
import { signOut, useSession } from '@/lib/auth-client'
import {
  BarChart3,
  Check,
  ChevronDown,
  CreditCard,
  Key,
  LayoutDashboard,
  LogOut,
  Network,
  Plus,
  Receipt,
  ScrollText,
  Settings,
  User,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Org {
  id: string
  name: string
  slug: string
  role: string
}

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
  { href: '/profile', label: 'Profile', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const [orgReady, setOrgReady] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [activeOrg, setActiveOrg] = useState<Org | null>(null)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const orgDropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const fetchOrgs = useCallback(async () => {
    try {
      const orgList = await api.get<Org[]>('/v1/user/orgs')
      setOrgs(orgList ?? [])
      const firstOrg = orgList?.[0]
      if (firstOrg) {
        setOrgId(firstOrg.id)
        setActiveOrg(firstOrg)
      }
    } catch {
      // Org endpoint may not exist yet — try to continue without
    }
    setOrgReady(true)
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchOrgs()
    }
  }, [session?.user, fetchOrgs])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOrgDropdownOpen(false)
    }
    if (orgDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [orgDropdownOpen])

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

  const handleSwitchOrg = (org: Org) => {
    setOrgId(org.id)
    setActiveOrg(org)
    setOrgDropdownOpen(false)
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r border-border bg-muted/50 flex flex-col">
        <div ref={orgDropdownRef} className="relative border-b border-border">
          <button
            type="button"
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="flex w-full items-center gap-2 px-5 py-4 transition-colors hover:bg-accent"
          >
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                {activeOrg?.name?.charAt(0)?.toUpperCase() ?? 'R'}
              </span>
            </div>
            <span className="flex-1 text-left font-semibold truncate">
              {activeOrg?.name ?? 'Raven'}
            </span>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-2 right-2 z-50 mt-1 rounded-lg border border-border bg-popover py-1 shadow-md ring-1 ring-black/5">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSwitchOrg(org)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                    org.id === activeOrg?.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Check
                    className={`size-3.5 shrink-0 ${org.id === activeOrg?.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {org.name}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <Link
                  href="/profile"
                  onClick={() => setOrgDropdownOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="size-3.5 shrink-0" />
                  Create Organization
                </Link>
              </div>
            </div>
          )}
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
