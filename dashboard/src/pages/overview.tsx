import { BarChart } from '@/components/charts/bar-chart'
import {
  DateRangePicker,
  getDateRange,
  getGranularity,
} from '@/components/shared/date-range-picker'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCacheStats, useCost, useLatency, useUsage } from '@/hooks/use-analytics'
import { useProviders } from '@/hooks/use-providers'
import { formatCurrency, formatLatency, formatNumber, formatPercent } from '@/lib/utils'
import { Activity, DollarSign, Server, Timer, Zap } from 'lucide-react'
import { useState } from 'react'

export default function OverviewPage() {
  const [range, setRange] = useState('24h')
  const { start, end } = getDateRange(range)
  const granularity = getGranularity(range)

  const analyticsOpts = { start, end, granularity }

  const { data: usage } = useUsage(analyticsOpts)
  const { data: cost } = useCost(analyticsOpts)
  const { data: latency } = useLatency(analyticsOpts)
  const { data: cache } = useCacheStats(analyticsOpts)
  const { data: providers } = useProviders()

  const topModels = usage?.requests_by_model
    ? Object.entries(usage.requests_by_model)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gateway performance at a glance
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={formatNumber(usage?.total_requests ?? 0)}
          icon={<Activity className="h-5 w-5" />}
          sparklineData={usage?.timeseries}
          sparklineColor="#6366f1"
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(cost?.total_cost ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
          sparklineData={cost?.timeseries}
          sparklineColor="#f59e0b"
        />
        <StatCard
          label="Cache Hit Rate"
          value={formatPercent(cache?.hit_rate ?? 0)}
          icon={<Zap className="h-5 w-5" />}
          sparklineData={cache?.timeseries}
          sparklineColor="#22c55e"
        />
        <StatCard
          label="Avg Latency"
          value={formatLatency(latency?.avg_latency_ms ?? 0)}
          icon={<Timer className="h-5 w-5" />}
          sparklineData={latency?.timeseries}
          sparklineColor="#818cf8"
        />
      </div>

      {/* Two cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top models */}
        <Card>
          <CardHeader>
            <CardTitle>Top Models by Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {topModels.length > 0 ? (
              <BarChart data={topModels} height={220} valueFormatter={formatNumber} />
            ) : (
              <EmptyState
                title="No requests yet"
                description="Send your first request to see model usage"
                icon={<Activity className="h-8 w-8 text-zinc-600" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Provider health */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Health</CardTitle>
          </CardHeader>
          <CardContent>
            {providers && providers.length > 0 ? (
              <div className="space-y-1">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[3%] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white/[4%] p-2">
                        <Server className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          {provider.display_name}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {provider.models.length} models
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        provider.status === 'healthy'
                          ? 'success'
                          : provider.status === 'degraded'
                            ? 'warning'
                            : 'error'
                      }
                      dot
                    >
                      {provider.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No providers configured"
                description="Go to Providers to add your API keys"
                icon={<Server className="h-8 w-8 text-zinc-600" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
