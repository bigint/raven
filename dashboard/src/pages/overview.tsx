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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Gateway performance at a glance</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={formatNumber(usage?.total_requests ?? 0)}
          icon={<Activity className="h-4 w-4" />}
          sparklineData={usage?.timeseries}
          sparklineColor="#14b8a6"
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(cost?.total_cost ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
          sparklineData={cost?.timeseries}
          sparklineColor="#f59e0b"
        />
        <StatCard
          label="Cache Hit Rate"
          value={formatPercent(cache?.hit_rate ?? 0)}
          icon={<Zap className="h-4 w-4" />}
          sparklineData={cache?.timeseries}
          sparklineColor="#22c55e"
        />
        <StatCard
          label="Avg Latency"
          value={formatLatency(latency?.avg_latency_ms ?? 0)}
          icon={<Timer className="h-4 w-4" />}
          sparklineData={latency?.timeseries}
          sparklineColor="#2dd4bf"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Models</CardTitle>
          </CardHeader>
          <CardContent>
            {topModels.length > 0 ? (
              <BarChart data={topModels} height={200} valueFormatter={formatNumber} />
            ) : (
              <EmptyState
                title="No requests yet"
                description="Send your first request to see model usage"
                icon={<Activity className="h-6 w-6 text-zinc-500" />}
              />
            )}
          </CardContent>
        </Card>

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
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-800/40 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-zinc-800 p-1.5">
                        <Server className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{provider.display_name}</p>
                        <p className="text-[11px] text-zinc-600">{provider.models.length} models</p>
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
                icon={<Server className="h-6 w-6 text-zinc-500" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
