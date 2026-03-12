import { CommandPalette } from '@/components/shared/command-palette'
import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from './sidebar'

interface ShellProps {
  readonly children: ReactNode
}

export const Shell = ({ children }: ShellProps) => {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const navigate = useNavigate()

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (mod && e.key === '1') {
        e.preventDefault()
        navigate('/')
      } else if (mod && e.key === '2') {
        e.preventDefault()
        navigate('/requests')
      } else if (mod && e.key === '3') {
        e.preventDefault()
        navigate('/analytics')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        onOpenPalette={() => setPaletteOpen(true)}
        gatewayStatus={gatewayStatus}
      />
      <div className="max-lg:ml-0 lg:ml-[220px]">
        <main className="p-5">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
