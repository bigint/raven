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
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { Database, HardDrive, TrendingUp, Zap } from 'lucide-react'
import { useState } from 'react'

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function CachePage() {
  const [range, setRange] = useState('24h')
  const { start, end } = getDateRange(range)
  const granularity = getGranularity(range)

  const { data: cache } = useCacheStats({ start, end, granularity })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cache</h1>
          <p className="text-sm text-zinc-500 mt-1">Semantic cache performance metrics</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Hit Rate"
          value={formatPercent(cache?.hit_rate ?? 0)}
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Total Hits"
          value={formatNumber(cache?.total_hits ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Storage Used"
          value={formatBytes(cache?.storage_bytes ?? 0)}
          icon={<HardDrive className="h-5 w-5" />}
        />
        <StatCard
          label="Cost Savings"
          value={formatCurrency(cache?.savings ?? 0)}
          icon={<Database className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cache Hit Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {cache?.timeseries && cache.timeseries.length > 0 ? (
            <AreaChart
              data={cache.timeseries}
              color="#22c55e"
              gradientId="cacheGradient"
              valueFormatter={(v) => formatPercent(v)}
            />
          ) : (
            <EmptyState
              title="No cache data yet"
              description="Cache metrics will appear once requests are processed"
              icon={<Zap className="h-8 w-8 text-zinc-600" />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
