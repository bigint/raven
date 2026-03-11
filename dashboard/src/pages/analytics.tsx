import { AreaChart } from '@/components/charts/area-chart'
import { BarChart } from '@/components/charts/bar-chart'
import {
  DateRangePicker,
  getDateRange,
  getGranularity,
} from '@/components/shared/date-range-picker'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCacheStats, useCost, useUsage } from '@/hooks/use-analytics'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DollarSign, TrendingUp, Zap } from 'lucide-react'
import { useState } from 'react'

export default function AnalyticsPage() {
  const [range, setRange] = useState('7d')
  const [tab, setTab] = useState('cost')
  const { start, end } = getDateRange(range)
  const granularity = getGranularity(range)

  const analyticsOpts = { start, end, granularity }

  const { data: cost, isLoading: costLoading } = useCost(analyticsOpts)
  const { data: usage, isLoading: usageLoading } = useUsage(analyticsOpts)
  const { data: cache, isLoading: cacheLoading } = useCacheStats(analyticsOpts)

  const isLoading = costLoading || usageLoading || cacheLoading

  const costByTeam = cost?.cost_by_team
    ? Object.entries(cost.cost_by_team)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }))
    : []

  const costByModel = cost?.cost_by_model
    ? Object.entries(cost.cost_by_model)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Analytics</h1>
          <p className="text-sm text-text-dark-secondary mt-1">Cost and usage analytics</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Cost"
            value={formatCurrency(cost?.total_cost ?? 0)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            label="Projected Monthly"
            value={formatCurrency(cost?.projected_monthly ?? 0)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            label="Cache Savings"
            value={formatCurrency(cache?.savings ?? 0)}
            icon={<Zap className="h-5 w-5" />}
          />
          <StatCard label="Total Requests" value={formatNumber(usage?.total_requests ?? 0)} />
        </div>
      )}

      {/* Tabs */}
      <div>
        <TabsList>
          <TabsTrigger value="cost" activeValue={tab} onSelect={setTab}>
            Cost Over Time
          </TabsTrigger>
          <TabsTrigger value="team" activeValue={tab} onSelect={setTab}>
            By Team
          </TabsTrigger>
          <TabsTrigger value="model" activeValue={tab} onSelect={setTab}>
            By Model
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cost" activeValue={tab}>
          <Card>
            <CardHeader>
              <CardTitle>Cost Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {cost?.timeseries && cost.timeseries.length > 0 ? (
                <AreaChart
                  data={cost.timeseries}
                  color="#F59E0B"
                  gradientId="costGradient"
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-text-dark-secondary">
                  No cost data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" activeValue={tab}>
          <Card>
            <CardHeader>
              <CardTitle>Cost by Team</CardTitle>
            </CardHeader>
            <CardContent>
              {costByTeam.length > 0 ? (
                <BarChart
                  data={costByTeam}
                  color="#4338CA"
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-text-dark-secondary">
                  No team cost data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" activeValue={tab}>
          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
            </CardHeader>
            <CardContent>
              {costByModel.length > 0 ? (
                <BarChart
                  data={costByModel}
                  color="#6366F1"
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-text-dark-secondary">
                  No model cost data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </div>
  )
}
