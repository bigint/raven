import { BarChart } from '@/components/charts/bar-chart'
import {
  DateRangePicker,
  getDateRange,
  getGranularity,
} from '@/components/shared/date-range-picker'
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
      {/* Header with title and date range picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gateway performance at a glance
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* 4 stat cards - always visible, show 0 if no data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={formatNumber(usage?.total_requests ?? 0)}
          icon={<Activity className="h-5 w-5" />}
          sparklineData={usage?.timeseries}
          sparklineColor="#4338CA"
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(cost?.total_cost ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
          sparklineData={cost?.timeseries}
          sparklineColor="#F59E0B"
        />
        <StatCard
          label="Cache Hit Rate"
          value={formatPercent(cache?.hit_rate ?? 0)}
          icon={<Zap className="h-5 w-5" />}
          sparklineData={cache?.timeseries}
          sparklineColor="#22C55E"
        />
        <StatCard
          label="Avg Latency"
          value={formatLatency(latency?.avg_latency_ms ?? 0)}
          icon={<Timer className="h-5 w-5" />}
          sparklineData={latency?.timeseries}
          sparklineColor="#6366F1"
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
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <Activity className="h-8 w-8 text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-500">No requests yet</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Send your first request to see model usage
                </p>
              </div>
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
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-4 w-4 text-neutral-500" />
                      <div>
                        <p className="text-sm font-medium text-neutral-100">
                          {provider.display_name}
                        </p>
                        <p className="text-xs text-neutral-500">
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
                    >
                      {provider.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <Server className="h-8 w-8 text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-500">No providers configured</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Go to Providers to add your API keys
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
