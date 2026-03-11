import type { TimeseriesPoint } from '@/lib/types'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: TimeseriesPoint[]
  color?: string
  height?: number
  width?: number
}

export function Sparkline({ data, color = '#6366f1', height = 40, width = 120 }: SparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sparkGrad-${color.replace('#', '')})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
