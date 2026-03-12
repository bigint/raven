import { AreaChart } from '@/components/charts/area-chart'
import { BarChart } from '@/components/charts/bar-chart'
import {
  DateRangePicker,
  getDateRange,
  getGranularity,
} from '@/components/shared/date-range-picker'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCacheStats, useCost, useUsage } from '@/hooks/use-analytics'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DollarSign } from 'lucide-react'
import { useMemo, useState } from 'react'

const AnalyticsPage = () => {
  const [range, setRange] = useState('7d')
  const [tab, setTab] = useState('cost')
  const analyticsOpts = useMemo(() => {
    const { start, end } = getDateRange(range)
    const granularity = getGranularity(range)
    return { start, end, granularity }
  }, [range])

  const { data: cost } = useCost(analyticsOpts)
  const { data: usage } = useUsage(analyticsOpts)
  const { data: cache } = useCacheStats(analyticsOpts)

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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Analytics</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Cost" value={formatCurrency(cost?.total_cost ?? 0)} />
        <StatCard label="Projected Monthly" value={formatCurrency(cost?.projected_monthly ?? 0)} />
        <StatCard label="Cache Savings" value={formatCurrency(cache?.savings ?? 0)} />
        <StatCard label="Total Requests" value={formatNumber(usage?.total_requests ?? 0)} />
      </div>

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
                  gradientId="costGradient"
                  height={240}
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <EmptyState
                  title="No cost data yet"
                  description="Cost data will appear once requests are processed"
                  icon={<DollarSign className="size-5" />}
                />
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
                  layout="horizontal"
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <EmptyState
                  title="No team cost data yet"
                  description="Create teams and route requests to see cost breakdowns"
                  icon={<DollarSign className="size-5" />}
                />
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
                  layout="horizontal"
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <EmptyState
                  title="No model cost data yet"
                  description="Send requests through the gateway to see model-level costs"
                  icon={<DollarSign className="size-5" />}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </div>
  )
}

export default AnalyticsPage
