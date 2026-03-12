import {
  Bar,
  Cell,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BarChartProps {
  readonly data: readonly { readonly name: string; readonly value: number }[]
  readonly height?: number
  readonly valueFormatter?: (value: number) => string
  readonly layout?: 'vertical' | 'horizontal'
}

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly {
    readonly value: number
    readonly payload: { readonly name: string }
  }[]
  readonly valueFormatter?: (value: number) => string
}

const ChartTooltip = ({ active, payload, valueFormatter }: ChartTooltipProps) => {
  const entry = payload?.[0]
  if (!active || !entry) return null
  return (
    <div className="rounded-[4px] border border-border-hover bg-elevated px-2 py-1">
      <p className="text-[11px] text-text-secondary">
        {entry.payload.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value}
      </p>
    </div>
  )
}

const getBarOpacity = (value: number, max: number): number => {
  if (max === 0) return 0.04
  return 0.04 + (value / max) * 0.12
}

export const BarChart = ({
  data,
  height = 200,
  valueFormatter,
  layout = 'vertical',
}: BarChartProps) => {
  const chartData = [...data]
  const max = Math.max(...chartData.map((d) => d.value), 0)
  const tickFill = 'var(--c-text-muted)'
  const axisStroke = 'var(--c-border)'

  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: tickFill }}
            width={80}
          />
          <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={16} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell
                key={`${entry.name}-${entry.value}`}
                fill="var(--c-chart-bar)"
                fillOpacity={getBarOpacity(entry.value, max) / 0.08}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="name"
          axisLine={{ stroke: axisStroke }}
          tickLine={false}
          tick={{ fontSize: 10, fill: tickFill }}
        />
        <YAxis
          axisLine={{ stroke: axisStroke }}
          tickLine={false}
          tick={{ fontSize: 10, fill: tickFill, fontFamily: 'var(--font-mono)' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={20} isAnimationActive={false}>
          {chartData.map((entry) => (
            <Cell
              key={`${entry.name}-${entry.value}`}
              fill="var(--c-chart-bar)"
              fillOpacity={getBarOpacity(entry.value, max) / 0.08}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
