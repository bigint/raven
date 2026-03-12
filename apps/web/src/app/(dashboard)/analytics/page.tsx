'use client'

import { api } from '@/lib/api'
import { Activity, Clock, DollarSign, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Stats {
  totalRequests: number
  totalCost: number
  avgLatency: number
  cacheHitRate: number
}

interface UsageRow {
  provider: string
  model: string
  requests: number
  cost: number
  tokens: number
}

type DateRange = '7d' | '30d' | '90d'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  azure: 'Azure',
  cohere: 'Cohere',
  mistral: 'Mistral',
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  const fetchData = async (range: DateRange) => {
    try {
      setLoading(true)
      setError(null)
      const [statsData, usageData] = await Promise.all([
        api.get<Stats>(`/v1/analytics/stats?range=${range}`),
        api.get<UsageRow[]>(`/v1/analytics/usage?range=${range}`),
      ])
      setStats({
        totalRequests: Number(statsData.totalRequests) || 0,
        totalCost: Number(statsData.totalCost) || 0,
        avgLatency: Number(statsData.avgLatency) || 0,
        cacheHitRate: Number(statsData.cacheHitRate) || 0,
      })
      setUsage(usageData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(dateRange)
  }, [dateRange])

  const statCards = [
    {
      label: 'Total Requests',
      value: stats ? stats.totalRequests.toLocaleString() : '—',
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Cost',
      value: stats ? `$${stats.totalCost.toFixed(4)}` : '—',
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Avg Latency',
      value: stats ? `${Math.round(stats.avgLatency)}ms` : '—',
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Cache Hit Rate',
      value: stats ? `${(stats.cacheHitRate * 100).toFixed(1)}%` : '—',
      icon: Zap,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track usage, costs, and performance across providers.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDateRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border border-border p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`size-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                ) : (
                  <span className="text-2xl font-bold">{card.value}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Usage Breakdown Table */}
      <div>
        <h2 className="mb-4 text-base font-semibold">Usage by Provider & Model</h2>
        {loading ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">Loading analytics...</p>
          </div>
        ) : usage.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground">No usage data for this period.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Provider
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Model
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Requests
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tokens
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row, idx) => (
                  <tr
                    key={`${row.provider}-${row.model}`}
                    className={`transition-colors hover:bg-muted/30 ${idx !== usage.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <td className="px-5 py-4 font-medium">
                      {PROVIDER_LABELS[row.provider] ?? row.provider}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-muted-foreground">
                      {row.model}
                    </td>
                    <td className="px-5 py-4 text-right">{row.requests.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">${row.cost.toFixed(4)}</td>
                    <td className="px-5 py-4 text-right">{row.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
