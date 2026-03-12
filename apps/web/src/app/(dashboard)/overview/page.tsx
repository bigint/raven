'use client'

import { api } from '@/lib/api'
import { Activity, DollarSign, Key, Network } from 'lucide-react'
import { useEffect, useState } from 'react'

interface OverviewStats {
  totalRequests: number
  totalCost: number
  activeKeys?: number
  providers?: number
  avgLatency?: number
  cacheHitRate?: number
}

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<OverviewStats>('/v1/analytics/stats?range=30d')
        setStats({
          totalRequests: Number(data.totalRequests) || 0,
          totalCost: Number(data.totalCost) || 0,
          activeKeys: Number(data.activeKeys) || 0,
          providers: Number(data.providers) || 0,
        })
      } catch {
        // Stats API may not return all fields yet, use defaults
        setStats({ totalRequests: 0, totalCost: 0, activeKeys: 0, providers: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Total Requests',
      value: stats ? stats.totalRequests.toLocaleString() : '—',
      icon: Activity,
      bg: 'bg-blue-500/10',
      color: 'text-blue-500',
    },
    {
      label: 'Total Cost',
      value: stats ? `$${stats.totalCost.toFixed(2)}` : '—',
      icon: DollarSign,
      bg: 'bg-green-500/10',
      color: 'text-green-500',
    },
    {
      label: 'Active Keys',
      value: stats ? String(stats.activeKeys) : '—',
      icon: Key,
      bg: 'bg-purple-500/10',
      color: 'text-purple-500',
    },
    {
      label: 'Providers',
      value: stats ? String(stats.providers) : '—',
      icon: Network,
      bg: 'bg-orange-500/10',
      color: 'text-orange-500',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-border p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`size-4 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                ) : (
                  <span className="text-2xl font-bold">{stat.value}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">
          Add a provider and create virtual keys to start routing AI requests.
        </p>
      </div>
    </div>
  )
}
