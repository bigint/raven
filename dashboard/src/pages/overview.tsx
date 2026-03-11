import { BarChart } from '@/components/charts/bar-chart'
import {
  DateRangePicker,
  getDateRange,
  getGranularity,
} from '@/components/shared/date-range-picker'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
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

  const { data: usage, isLoading: usageLoading } = useUsage(analyticsOpts)
  const { data: cost, isLoading: costLoading } = useCost(analyticsOpts)
  const { data: latency, isLoading: latencyLoading } = useLatency(analyticsOpts)
  const { data: cache, isLoading: cacheLoading } = useCacheStats(analyticsOpts)
  const { data: providers } = useProviders()

  const isLoading = usageLoading || costLoading || latencyLoading || cacheLoading

  const topModels = usage?.requests_by_model
    ? Object.entries(usage.requests_by_model)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Overview</h1>
          <p className="text-sm text-text-dark-secondary mt-1">Gateway performance at a glance</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={formatNumber(usage?.total_requests ?? 0)}
            trend={12.5}
            trendLabel="vs prev"
            icon={<Activity className="h-5 w-5" />}
            sparklineData={usage?.timeseries}
            sparklineColor="#4338CA"
          />
          <StatCard
            label="Total Cost"
            value={formatCurrency(cost?.total_cost ?? 0)}
            trend={-3.2}
            trendLabel="vs prev"
            icon={<DollarSign className="h-5 w-5" />}
            sparklineData={cost?.timeseries}
            sparklineColor="#F59E0B"
          />
          <StatCard
            label="Cache Hit Rate"
            value={formatPercent(cache?.hit_rate ?? 0)}
            trend={5.1}
            trendLabel="vs prev"
            icon={<Zap className="h-5 w-5" />}
            sparklineData={cache?.timeseries}
            sparklineColor="#22C55E"
          />
          <StatCard
            label="Avg Latency"
            value={formatLatency(latency?.avg_latency_ms ?? 0)}
            trend={-8.4}
            trendLabel="vs prev"
            icon={<Timer className="h-5 w-5" />}
            sparklineData={latency?.timeseries}
            sparklineColor="#6366F1"
          />
        </div>
      )}

      {/* Charts row */}
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
              <div className="flex items-center justify-center h-[220px] text-sm text-text-dark-secondary">
                No data available
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
            <div className="space-y-3">
              {providers && providers.length > 0 ? (
                providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between py-2 border-b border-border-dark last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-4 w-4 text-text-dark-secondary" />
                      <div>
                        <p className="text-sm font-medium text-text-dark">
                          {provider.display_name}
                        </p>
                        <p className="text-xs text-text-dark-secondary">
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
                ))
              ) : (
                <div className="flex items-center justify-center h-[220px] text-sm text-text-dark-secondary">
                  No providers configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
