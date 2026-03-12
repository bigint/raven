import { cn } from '@/lib/utils'
import {
  BarChart3, Cpu, Database, Key, LayoutDashboard, List, Puzzle,
  Server, Settings, Shield, Users, Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface PaletteItem {
  id: string
  label: string
  category: 'Pages' | 'Actions'
  icon: React.ReactNode
  path?: string
  shortcut?: string
  action?: () => void
}

const pageItems: PaletteItem[] = [
  { id: 'overview', label: 'Overview', category: 'Pages', icon: <LayoutDashboard className="h-3.5 w-3.5" />, path: '/', shortcut: '⌘1' },
  { id: 'requests', label: 'Requests', category: 'Pages', icon: <List className="h-3.5 w-3.5" />, path: '/requests', shortcut: '⌘2' },
  { id: 'analytics', label: 'Analytics', category: 'Pages', icon: <BarChart3 className="h-3.5 w-3.5" />, path: '/analytics', shortcut: '⌘3' },
  { id: 'providers', label: 'Providers', category: 'Pages', icon: <Server className="h-3.5 w-3.5" />, path: '/providers' },
  { id: 'models', label: 'Models', category: 'Pages', icon: <Cpu className="h-3.5 w-3.5" />, path: '/models' },
  { id: 'keys', label: 'Keys', category: 'Pages', icon: <Key className="h-3.5 w-3.5" />, path: '/keys' },
  { id: 'teams', label: 'Teams', category: 'Pages', icon: <Users className="h-3.5 w-3.5" />, path: '/teams' },
  { id: 'budgets', label: 'Budgets', category: 'Pages', icon: <Wallet className="h-3.5 w-3.5" />, path: '/budgets' },
  { id: 'cache', label: 'Cache', category: 'Pages', icon: <Database className="h-3.5 w-3.5" />, path: '/cache' },
  { id: 'guardrails', label: 'Guardrails', category: 'Pages', icon: <Shield className="h-3.5 w-3.5" />, path: '/guardrails' },
  { id: 'plugins', label: 'Plugins', category: 'Pages', icon: <Puzzle className="h-3.5 w-3.5" />, path: '/plugins' },
  { id: 'settings', label: 'Settings', category: 'Pages', icon: <Settings className="h-3.5 w-3.5" />, path: '/settings' },
]

const actionItems: PaletteItem[] = [
  { id: 'create-key', label: 'Create Key', category: 'Actions', icon: <Key className="h-3.5 w-3.5" />, path: '/keys' },
  { id: 'create-org', label: 'Create Org', category: 'Actions', icon: <Users className="h-3.5 w-3.5" />, path: '/teams' },
  { id: 'create-budget', label: 'Create Budget', category: 'Actions', icon: <Wallet className="h-3.5 w-3.5" />, path: '/budgets' },
]

const allItems = [...pageItems, ...actionItems]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const execute = (item: PaletteItem) => {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault()
      execute(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  const grouped = {
    Pages: filtered.filter((i) => i.category === 'Pages'),
    Actions: filtered.filter((i) => i.category === 'Actions'),
  }

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-overlay" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] rounded-lg border border-border-hover bg-elevated overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, settings..."
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-text-tertiary">No results</p>
          ) : (
            Object.entries(grouped).map(([category, items]) =>
              items.length > 0 ? (
                <div key={category} className="mb-2 last:mb-0">
                  <p className="px-2 py-1 text-[9px] font-medium text-text-muted uppercase tracking-[1px]">
                    {category}
                  </p>
                  {items.map((item) => {
                    flatIndex++
                    const isActive = flatIndex === activeIndex
                    const idx = flatIndex
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-selected={isActive}
                        onClick={() => execute(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-xs',
                          isActive ? 'bg-surface-hover text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        <span className="text-text-tertiary">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[9px] font-mono text-text-muted">{item.shortcut}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : null,
            )
          )}
        </div>
      </div>
    </div>
  )
}
