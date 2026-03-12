import type { TimeseriesPoint } from '@/lib/types'
import { format } from 'date-fns'
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface AreaChartProps {
  readonly data: TimeseriesPoint[]
  readonly gradientId?: string
  readonly height?: number
  readonly valueFormatter?: (value: number) => string
  readonly xAxisFormatter?: (timestamp: string) => string
}

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: { value: number }[]
  readonly valueFormatter?: (value: number) => string
}

const ChartTooltip = ({ active, payload, valueFormatter }: ChartTooltipProps) => {
  const entry = payload?.[0]
  if (!active || !entry) return null
  return (
    <div className="rounded-[4px] border border-border-hover bg-elevated px-2 py-1">
      <p className="text-[11px] text-text-secondary">
        {valueFormatter ? valueFormatter(entry.value) : entry.value}
      </p>
    </div>
  )
}

export const AreaChart = ({
  data,
  gradientId = 'areaGrad',
  height = 240,
  valueFormatter,
  xAxisFormatter,
}: AreaChartProps) => {
  const formatX = xAxisFormatter ?? ((ts: string) => format(new Date(ts), 'MMM d'))
  const tickFill = 'var(--c-text-muted)'
  const axisStroke = 'var(--c-border)'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-chart-fill-from)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--c-chart-fill-to)" stopOpacity={1} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatX}
          axisLine={{ stroke: axisStroke }}
          tickLine={false}
          tick={{ fontSize: 10, fill: tickFill, fontFamily: 'var(--font-mono)' }}
        />
        <YAxis
          axisLine={{ stroke: axisStroke }}
          tickLine={false}
          tick={{ fontSize: 10, fill: tickFill, fontFamily: 'var(--font-mono)' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--c-chart-line)"
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: 'var(--c-text-primary)', stroke: 'none' }}
          isAnimationActive={false}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
