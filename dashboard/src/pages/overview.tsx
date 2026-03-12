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
import { Server } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function OverviewPage() {
  const [range, setRange] = useState('24h')
  const analyticsOpts = useMemo(() => {
    const { start, end } = getDateRange(range)
    const granularity = getGranularity(range)
    return { start, end, granularity }
  }, [range])

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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Overview</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Requests"
          value={formatNumber(usage?.total_requests ?? 0)}
          sparklineData={usage?.timeseries}
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(cost?.total_cost ?? 0)}
          sparklineData={cost?.timeseries}
        />
        <StatCard
          label="Cache Hit Rate"
          value={formatPercent(cache?.hit_rate ?? 0)}
          sparklineData={cache?.timeseries}
        />
        <StatCard
          label="Avg Latency"
          value={formatLatency(latency?.avg_latency_ms ?? 0)}
          sparklineData={latency?.timeseries}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Models</CardTitle>
          </CardHeader>
          <CardContent>
            {topModels.length > 0 ? (
              <BarChart data={topModels} height={200} layout="horizontal" valueFormatter={formatNumber} />
            ) : (
              <EmptyState
                title="No requests yet"
                description="Send your first request to see model usage"
                icon={<Server className="h-5 w-5" />}
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
              <div>
                {providers.map((provider) => {
                  const status = provider.healthy ? 'healthy' : provider.configured ? 'degraded' : 'down'
                  return (
                    <div
                      key={provider.name}
                      className="flex items-center justify-between h-9 px-3 hover:bg-surface"
                    >
                      <span className="text-xs text-text-secondary">{provider.display_name}</span>
                      <Badge
                        variant={
                          status === 'healthy'
                            ? 'success'
                            : status === 'degraded'
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="No providers configured"
                description="Go to Providers to add your API keys"
                icon={<Server className="h-5 w-5" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
