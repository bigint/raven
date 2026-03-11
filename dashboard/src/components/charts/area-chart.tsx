import type { TimeseriesPoint } from '@/lib/types'
import { format } from 'date-fns'
import {
  Area,
  CartesianGrid,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface AreaChartProps {
  data: TimeseriesPoint[]
  color?: string
  gradientId?: string
  height?: number
  valueFormatter?: (value: number) => string
  xAxisFormatter?: (value: string) => string
}

export function AreaChart({
  data,
  color = 'rgba(255,255,255,0.3)',
  gradientId = 'areaGradient',
  height = 300,
  valueFormatter = (v) => v.toLocaleString(),
  xAxisFormatter = (v) => format(new Date(v), 'HH:mm'),
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.06} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={xAxisFormatter}
          stroke="rgba(255,255,255,0.04)"
          tick={{ fill: '#525252', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={valueFormatter}
          stroke="rgba(255,255,255,0.04)"
          tick={{ fill: '#525252', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fafafa',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          }}
          formatter={(value: number) => [valueFormatter(value), 'Value']}
          labelFormatter={(label: string) => format(new Date(label), 'MMM d, HH:mm')}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
