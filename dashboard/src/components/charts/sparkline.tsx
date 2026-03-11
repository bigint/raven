import type { TimeseriesPoint } from '@/lib/types'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: TimeseriesPoint[]
  height?: number
  width?: number
}

export function Sparkline({ data, height = 28, width = 64 }: SparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id="sparkGradMono" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgba(255,255,255,0.03)" stopOpacity={1} />
            <stop offset="95%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1.5}
          fill="url(#sparkGradMono)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
