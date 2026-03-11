import { cn } from '@/lib/utils'
import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/requests': 'Requests',
  '/analytics': 'Analytics',
  '/providers': 'Providers',
  '/models': 'Models',
  '/keys': 'Virtual Keys',
  '/teams': 'Teams & Users',
  '/budgets': 'Budgets',
  '/cache': 'Cache',
  '/guardrails': 'Guardrails',
  '/plugins': 'Plugins',
  '/settings': 'Settings',
}

export function Header() {
  const location = useLocation()
  const [gatewayStatus, setGatewayStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const currentTitle = pageTitles[location.pathname] ?? 'Dashboard'

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/health')
        setGatewayStatus(res.ok ? 'connected' : 'disconnected')
      } catch {
        setGatewayStatus('disconnected')
      }
    }
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md px-6 lg:px-8">
      <h1 className="text-sm font-semibold text-white">{currentTitle}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              gatewayStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse-dot'
                : 'bg-red-400 animate-pulse-dot',
            )}
          />
          <span className="text-[11px] text-zinc-500">
            {gatewayStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <Link
          to="/settings"
          className="rounded-lg p-2 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors duration-150"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}
