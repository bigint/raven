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

const navGroups = [
  {
    label: 'Core',
    items: [
      { path: '/', label: 'Overview', icon: LayoutDashboard },
      { path: '/requests', label: 'Requests', icon: List },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/providers', label: 'Providers', icon: Server },
      { path: '/models', label: 'Models', icon: Cpu },
      { path: '/keys', label: 'Keys', icon: Key },
      { path: '/teams', label: 'Teams', icon: Users },
      { path: '/budgets', label: 'Budgets', icon: Wallet },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/cache', label: 'Cache', icon: Database },
      { path: '/guardrails', label: 'Guardrails', icon: Shield },
      { path: '/plugins', label: 'Plugins', icon: Puzzle },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 rounded-xl bg-zinc-900 border border-white/[8%] p-2.5 lg:hidden hover:bg-white/[5%] transition-all duration-200"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-zinc-300" />
        ) : (
          <Menu className="h-5 w-5 text-zinc-300" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
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
          'fixed top-0 left-0 z-40 h-screen w-60 border-r border-white/[6%] bg-[#0a0a0f] flex flex-col transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/[6%]">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white text-sm tracking-tight">Raven</span>
            <span className="text-[10px] text-zinc-600 leading-none">AI Gateway</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6 last:mb-0">
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
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
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-white/[8%] text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[4%]',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors duration-200',
                            isActive ? 'text-indigo-400' : 'text-zinc-600',
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[6%] px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-700 uppercase tracking-wider">Raven Gateway</p>
            <span className="text-[10px] font-mono text-zinc-700 bg-white/[3%] px-1.5 py-0.5 rounded">
              v0.1.0
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
