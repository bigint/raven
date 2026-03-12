'use client'

import { useEventStream } from '@/hooks/use-event-stream'
import { api } from '@/lib/api'
import {
  Activity,
  ArrowRight,
  Clock,
  DollarSign,
  Key,
  Network,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Stats {
  totalRequests: number
  totalCost: string
  avgLatencyMs: string
  cacheHitRate: string
}

interface UsageRow {
  provider: string
  model: string
  totalRequests: number
  totalCost: string
  avgLatencyMs: string
}

interface RecentRequest {
  id: string
  provider: string
  model: string
  statusCode: number
  latencyMs: number
  cost: string
  createdAt: string
}

interface KeySummary {
  id: string
  name: string
  isActive: boolean
  lastUsedAt: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  azure: 'Azure',
  cohere: 'Cohere',
  mistral: 'Mistral',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([])
  const [keys, setKeys] = useState<KeySummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const from = new Date(Date.now() - 2_592_000_000).toISOString()
      const [statsData, usageData, requestsData, keysData] = await Promise.all([
        api.get<Stats>(`/v1/analytics/stats?from=${from}`),
        api.get<UsageRow[]>(`/v1/analytics/usage?from=${from}`),
        api.get<{ data: RecentRequest[] }>('/v1/analytics/requests?limit=5').then((r) => r.data),
        api.get<KeySummary[]>('/v1/keys'),
      ])
      setStats(statsData)
      setUsage(usageData)
      setRecentRequests(requestsData)
      setKeys(keysData)
    } catch {
      setStats({ totalRequests: 0, totalCost: '0', avgLatencyMs: '0.00', cacheHitRate: '0.0000' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalRequests = stats?.totalRequests ?? 0
  const totalCost = Number(stats?.totalCost ?? 0)
  const avgLatency = Number(stats?.avgLatencyMs ?? 0)
  const cacheHitRate = Number(stats?.cacheHitRate ?? 0) * 100
  const activeKeys = keys.filter((k) => k.isActive).length
  const providerCount = new Set(usage.map((u) => u.provider)).size

  const statCards = [
    {
      label: 'Total Requests',
      value: totalRequests.toLocaleString(),
      sub: 'Last 30 days',
      icon: Activity,
      bg: 'bg-blue-500/10',
      color: 'text-blue-500',
    },
    {
      label: 'Total Cost',
      value: `$${totalCost.toFixed(2)}`,
      sub: 'Last 30 days',
      icon: DollarSign,
      bg: 'bg-green-500/10',
      color: 'text-green-500',
    },
    {
      label: 'Avg Latency',
      value: `${avgLatency.toFixed(0)}ms`,
      sub: 'Across all requests',
      icon: Clock,
      bg: 'bg-yellow-500/10',
      color: 'text-yellow-500',
    },
    {
      label: 'Cache Hit Rate',
      value: `${cacheHitRate.toFixed(1)}%`,
      sub: `${activeKeys} active keys`,
      icon: Zap,
      bg: 'bg-purple-500/10',
      color: 'text-purple-500',
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage by Provider */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="size-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold">Usage by Provider</h2>
            </div>
            <Link
              href="/analytics"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : usage.length === 0 ? (
              <div className="py-6 text-center">
                <Network className="mx-auto size-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No usage data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usage.slice(0, 5).map((row) => {
                  const pct =
                    totalRequests > 0 ? (Number(row.totalRequests) / totalRequests) * 100 : 0
                  return (
                    <div key={`${row.provider}-${row.model}`}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {PROVIDER_LABELS[row.provider] ?? row.provider}
                          </span>
                          <span className="text-muted-foreground">{row.model}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground">
                          {Number(row.totalRequests).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="size-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold">Recent Requests</h2>
            </div>
            <Link
              href="/requests"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="py-6 text-center">
                <Activity className="mx-auto size-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No requests yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex size-2 rounded-full ${
                          req.statusCode >= 200 && req.statusCode < 300
                            ? 'bg-green-500'
                            : req.statusCode >= 400
                              ? 'bg-destructive'
                              : 'bg-yellow-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {PROVIDER_LABELS[req.provider] ?? req.provider}{' '}
                          <span className="text-muted-foreground">{req.model}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.latencyMs}ms &middot; ${Number(req.cost).toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/providers"
            className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Network className="size-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {providerCount > 0 ? `${providerCount} Providers` : 'Add Provider'}
              </p>
              <p className="text-xs text-muted-foreground">
                {providerCount > 0 ? 'Manage configurations' : 'Connect your first AI provider'}
              </p>
            </div>
          </Link>
          <Link
            href="/keys"
            className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Key className="size-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {activeKeys > 0 ? `${activeKeys} Active Keys` : 'Create Key'}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeKeys > 0 ? 'Manage virtual keys' : 'Create a virtual API key'}
              </p>
            </div>
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="rounded-lg bg-blue-500/10 p-2">
              <TrendingUp className="size-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Analytics</p>
              <p className="text-xs text-muted-foreground">View detailed usage analytics</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
