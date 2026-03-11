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
          <h1 className="text-base font-semibold text-[#fafafa]">Overview</h1>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                icon={<Server className="h-6 w-6 text-[#525252]" />}
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
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5">
                        <Server className="h-3.5 w-3.5 text-[#525252]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#fafafa]">{provider.display_name}</p>
                        <p className="text-[11px] text-[#525252]">{provider.models.length} models</p>
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
                icon={<Server className="h-6 w-6 text-[#525252]" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
