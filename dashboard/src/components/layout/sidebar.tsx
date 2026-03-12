import { cn } from '@/lib/utils'
import {
  BarChart3,
  BookOpen,
  Cpu,
  Database,
  Key,
  LayoutDashboard,
  List,
  Menu,
  Puzzle,
  Search,
  Server,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navGroups = [
  {
    label: 'Core',
    items: [
      { path: '/', label: 'Overview', icon: LayoutDashboard, shortcut: '⌘1' },
      { path: '/quickstart', label: 'Quick Start', icon: BookOpen },
      { path: '/requests', label: 'Requests', icon: List, shortcut: '⌘2' },
      { path: '/analytics', label: 'Analytics', icon: BarChart3, shortcut: '⌘3' },
    ],
  },
  {
    label: 'Manage',
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

interface SidebarProps {
  readonly onOpenPalette: () => void
  readonly gatewayStatus: 'connected' | 'disconnected'
}

export const Sidebar = ({ onOpenPalette, gatewayStatus }: SidebarProps) => {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileOpen])

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-[22px] rounded-md bg-accent flex items-center justify-center shrink-0">
            <span className="text-accent-text font-bold text-[10px]">R</span>
          </div>
          <span className="font-semibold text-text-primary text-[13px] tracking-[-0.3px]">
            Raven
          </span>
        </div>
      </div>

      {/* Command palette trigger */}
      <div className="px-2.5 py-3 shrink-0">
        <button
          type="button"
          onClick={onOpenPalette}
          className="w-full flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-text-muted hover:border-border-hover"
        >
          <Search className="size-3" />
          <span>Search...</span>
          <span className="ml-auto text-[9px] font-mono">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="px-2.5 mb-1.5 text-[9px] font-medium text-text-muted uppercase tracking-[1px]">
              {group.label}
            </p>
            <ul className="space-y-px">
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
                        'flex items-center gap-2 rounded-[5px] px-2.5 py-[6px] text-xs font-medium transition-colors duration-150',
                        isActive
                          ? 'bg-surface-active text-text-primary'
                          : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-[15px] shrink-0',
                          isActive ? 'text-text-primary' : 'text-text-tertiary',
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {'shortcut' in item && (
                        <span className="text-[9px] font-mono text-text-muted bg-surface-hover px-1 py-0.5 rounded-[3px]">
                          {item.shortcut}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border shrink-0 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <div
            className={cn(
              'size-[5px] rounded-full',
              gatewayStatus === 'connected' ? 'bg-success' : 'bg-error',
            )}
          />
          <span className="text-[10px] text-text-tertiary">
            {gatewayStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Raven</p>
          <span className="text-[10px] font-mono text-text-muted bg-surface-hover px-1.5 py-0.5 rounded-[3px]">
            v0.1.0
          </span>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        className="fixed top-3 left-3 z-50 h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-surface-hover lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          style={{ animation: 'overlay-in 150ms ease-out' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-40 h-screen w-[220px] border-r border-border bg-bg flex flex-col max-lg:hidden lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside
          className="fixed top-0 left-0 z-40 h-screen w-[220px] border-r border-border bg-bg flex flex-col lg:hidden"
          style={{ animation: 'fade-in 150ms ease-out' }}
        >
          {sidebarContent}
        </aside>
      )}
    </>
  )
}
