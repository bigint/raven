import { AreaChart } from '@/components/charts/area-chart'
import { DateRangePicker, getDateRange, getGranularity } from '@/components/shared/date-range-picker'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
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

  const { data: cache, isLoading } = useCacheStats({ start, end, granularity })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Cache</h1>
          <p className="text-sm text-text-dark-secondary mt-1">
            Semantic cache performance metrics
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}
        </div>
      ) : (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cache Hit Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {cache?.timeseries && cache.timeseries.length > 0 ? (
            <AreaChart
              data={cache.timeseries}
              color="#22C55E"
              gradientId="cacheGradient"
              valueFormatter={(v) => formatPercent(v)}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-text-dark-secondary">
              No cache data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
