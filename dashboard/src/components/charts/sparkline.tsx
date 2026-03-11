import type { TimeseriesPoint } from '@/lib/types'
import { Area, AreaChart as RechartsAreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: TimeseriesPoint[]
  width?: number
  height?: number
}

export function Sparkline({ data, width = 64, height = 28 }: SparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsAreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
          fill="url(#sparkGrad)"
          isAnimationActive={false}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
