import { cn } from '@/lib/utils'
import { Moon, Settings, Sun } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function Header() {
  const [dark, setDark] = useState(true)
  const [gatewayStatus, setGatewayStatus] = useState<'connected' | 'disconnected'>('connected')

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      if (next) {
        document.body.classList.remove('light')
      } else {
        document.body.classList.add('light')
      }
      return next
    })
  }, [])

  // Check gateway health
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/admin/v1/settings')
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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-dark bg-bg-dark-secondary/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              gatewayStatus === 'connected' ? 'bg-success' : 'bg-error',
            )}
          />
          <span className="text-xs text-text-dark-secondary">
            Gateway {gatewayStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-dark-secondary hover:text-text-dark hover:bg-white/10 transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Link
          to="/settings"
          className="rounded-lg p-2 text-text-dark-secondary hover:text-text-dark hover:bg-white/10 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}
