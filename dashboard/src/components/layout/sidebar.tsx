import { cn } from '@/lib/utils'
import {
  BarChart3,
  Cpu,
  Database,
  Key,
  LayoutDashboard,
  List,
  Menu,
  Puzzle,
  Server,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/requests', label: 'Requests', icon: List },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/providers', label: 'Providers', icon: Server },
  { path: '/models', label: 'Models', icon: Cpu },
  { path: '/keys', label: 'Keys', icon: Key },
  { path: '/teams', label: 'Teams', icon: Users },
  { path: '/budgets', label: 'Budgets', icon: Wallet },
  { path: '/cache', label: 'Cache', icon: Database },
  { path: '/guardrails', label: 'Guardrails', icon: Shield },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="fixed top-3 left-3 z-50 rounded-lg bg-bg-dark-secondary border border-border-dark p-2 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setMobileOpen(false)
          }}
          role="button"
          tabIndex={0}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-56 border-r border-border-dark bg-bg-dark-secondary flex flex-col transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-5 border-b border-border-dark">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-semibold text-text-dark">Raven</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary-light'
                        : 'text-text-dark-secondary hover:text-text-dark hover:bg-white/5',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border-dark px-4 py-3">
          <p className="text-[10px] text-text-dark-secondary/50 uppercase tracking-wider">
            Raven Gateway
          </p>
        </div>
      </aside>
    </>
  )
}
