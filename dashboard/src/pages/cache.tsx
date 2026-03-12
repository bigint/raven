import { AreaChart } from '@/components/charts/area-chart'
import {
  DateRangePicker,
  getDateRange,
  getGranularity,
} from '@/components/shared/date-range-picker'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCacheStats } from '@/hooks/use-analytics'
import { formatBytes, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { Zap } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function CachePage() {
  const [range, setRange] = useState('24h')
  const analyticsOpts = useMemo(() => {
    const { start, end } = getDateRange(range)
    const granularity = getGranularity(range)
    return { start, end, granularity }
  }, [range])

  const { data: cache } = useCacheStats(analyticsOpts)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Cache</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Hit Rate"
          value={formatPercent(cache?.hit_rate ?? 0)}
          sparklineData={cache?.timeseries}
        />
        <StatCard
          label="Total Hits"
          value={formatNumber(cache?.total_hits ?? 0)}
          sparklineData={cache?.timeseries}
        />
        <StatCard
          label="Storage"
          value={formatBytes(cache?.storage_bytes ?? 0)}
        />
        <StatCard
          label="Cost Savings"
          value={formatCurrency(cache?.savings ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cache Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {cache?.timeseries && cache.timeseries.length > 0 ? (
            <AreaChart
              data={cache.timeseries}
              gradientId="cacheGradient"
              height={240}
              valueFormatter={(v) => formatPercent(v)}
            />
          ) : (
            <EmptyState
              title="No cache data yet"
              description="Cache metrics will appear once requests are processed"
              icon={<Zap className="h-5 w-5" />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
