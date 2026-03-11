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
  data: TimeseriesPoint[]
  gradientId?: string
  height?: number
  valueFormatter?: (value: number) => string
  xAxisFormatter?: (timestamp: string) => string
}

function ChartTooltip({ active, payload, valueFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] px-2 py-1">
      <p className="text-[11px] text-[#a3a3a3]">
        {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  )
}

export function AreaChart({
  data,
  gradientId = 'areaGrad',
  height = 240,
  valueFormatter,
  xAxisFormatter,
}: AreaChartProps) {
  const formatX = xAxisFormatter ?? ((ts: string) => format(new Date(ts), 'MMM d'))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatX}
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#333', fontFamily: 'var(--font-mono)' }}
        />
        <YAxis
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#333', fontFamily: 'var(--font-mono)' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: '#fff', stroke: 'none' }}
          isAnimationActive={false}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
