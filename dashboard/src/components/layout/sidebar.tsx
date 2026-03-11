import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
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
  collapsed: boolean
  onToggle: () => void
  onOpenPalette: () => void
  gatewayStatus: 'connected' | 'disconnected'
}

export function Sidebar({ collapsed, onToggle, onOpenPalette, gatewayStatus }: SidebarProps) {
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
      <div className={cn(
        'flex h-12 items-center border-b border-white/[0.06] shrink-0',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}>
        <div className={cn('flex items-center', collapsed ? '' : 'gap-2')}>
          <div className="h-[22px] w-[22px] rounded-md bg-[#fafafa] flex items-center justify-center shrink-0">
            <span className="text-[#09090b] font-bold text-[10px]">R</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-[#e0e0e0] text-[13px] tracking-[-0.3px]">Raven</span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="h-5 w-5 rounded-[4px] flex items-center justify-center bg-white/[0.04] text-[#525252] hover:text-[#a3a3a3]"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Command palette trigger */}
      {collapsed ? (
        <div className="flex justify-center py-3 shrink-0">
          <button
            type="button"
            onClick={onOpenPalette}
            className="h-8 w-8 rounded-md flex items-center justify-center text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="px-2.5 py-3 shrink-0">
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full flex items-center gap-1.5 rounded-md border border-white/[0.06] px-2.5 py-1.5 text-[11px] text-[#333] hover:border-white/[0.10]"
          >
            <Search className="h-3 w-3" />
            <span>Search...</span>
            <span className="ml-auto text-[9px] font-mono">⌘K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[9px] font-medium text-[#333] uppercase tracking-[1px]">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mb-1" />}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                const Icon = item.icon

                if (collapsed) {
                  return (
                    <li key={item.path}>
                      <Tooltip content={`${item.label}${'shortcut' in item ? ` (${item.shortcut})` : ''}`} side="right">
                        <Link
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center justify-center h-8 w-8 mx-auto rounded-[5px]',
                            isActive
                              ? 'bg-white/[0.06] text-[#fafafa]'
                              : 'text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]',
                          )}
                        >
                          <Icon className="h-[15px] w-[15px]" />
                        </Link>
                      </Tooltip>
                    </li>
                  )
                }

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-[5px] px-2.5 py-[6px] text-xs font-medium',
                        isActive
                          ? 'bg-white/[0.06] text-[#fafafa]'
                          : 'text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className={cn('h-[15px] w-[15px] shrink-0', isActive ? 'text-[#fafafa]' : 'text-[#525252]')} />
                      <span className="flex-1">{item.label}</span>
                      {'shortcut' in item && (
                        <span className="text-[9px] font-mono text-[#333] bg-white/[0.04] px-1 py-0.5 rounded-[3px]">
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
      <div className={cn(
        'border-t border-white/[0.06] shrink-0',
        collapsed ? 'py-3 flex flex-col items-center gap-2' : 'px-4 py-3',
      )}>
        {collapsed ? (
          <>
            <div
              className={cn(
                'h-[5px] w-[5px] rounded-full',
                gatewayStatus === 'connected' ? 'bg-[#22c55e]' : 'bg-[#ef4444]',
              )}
            />
            <button
              type="button"
              onClick={onToggle}
              className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[#333] hover:text-[#a3a3a3] hover:bg-white/[0.04]"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className={cn(
                  'h-[5px] w-[5px] rounded-full',
                  gatewayStatus === 'connected' ? 'bg-[#22c55e]' : 'bg-[#ef4444]',
                )}
              />
              <span className="text-[10px] text-[#525252]">
                {gatewayStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#333] uppercase tracking-wider">Raven</p>
              <span className="text-[10px] font-mono text-[#333] bg-white/[0.04] px-1.5 py-0.5 rounded-[3px]">v0.1.0</span>
            </div>
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        className="fixed top-3 left-3 z-50 h-7 w-7 rounded-md flex items-center justify-center text-[#a3a3a3] hover:bg-white/[0.05] lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen border-r border-white/[0.06] bg-[#09090b] flex flex-col',
          collapsed ? 'w-[52px]' : 'w-[220px]',
          'max-lg:hidden lg:flex',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="fixed top-0 left-0 z-40 h-screen w-[220px] border-r border-white/[0.06] bg-[#09090b] flex flex-col lg:hidden">
          {sidebarContent}
        </aside>
      )}
    </>
  )
}
