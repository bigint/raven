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
      <button
        type="button"
        className="fixed top-4 left-4 z-50 rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5 text-zinc-300" /> : <Menu className="h-5 w-5 text-zinc-300" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setMobileOpen(false) }}
          role="button"
          tabIndex={0}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-[220px] border-r border-zinc-800/80 bg-zinc-950 flex flex-col transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2.5 px-5 border-b border-zinc-800/80">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white text-sm tracking-tight leading-none">Raven</span>
            <span className="text-[10px] text-zinc-600 leading-none mt-0.5">AI Gateway</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                  const Icon = item.icon
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors duration-150',
                          isActive
                            ? 'bg-teal-500/10 text-teal-300'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50',
                        )}
                      >
                        <Icon className={cn('h-[15px] w-[15px] shrink-0', isActive ? 'text-teal-400' : 'text-zinc-600')} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-800/80 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-700 uppercase tracking-wider">Raven</p>
            <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 rounded">v0.1.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}
