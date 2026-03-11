import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BarChartDataPoint {
  name: string
  value: number
}

interface BarChartProps {
  data: BarChartDataPoint[]
  color?: string
  height?: number
  valueFormatter?: (value: number) => string
  layout?: 'vertical' | 'horizontal'
}

export function BarChart({
  data,
  color = '#4338CA',
  height = 300,
  valueFormatter = (v) => v.toLocaleString(),
  layout = 'vertical',
}: BarChartProps) {
  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} layout="horizontal" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: '#A3A3A3', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={valueFormatter}
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: '#A3A3A3', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E1E1E',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F5F5F5',
            }}
            formatter={(value: number) => [valueFormatter(value), 'Value']}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={valueFormatter}
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: '#A3A3A3', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: '#A3A3A3', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E1E1E',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#F5F5F5',
          }}
          formatter={(value: number) => [valueFormatter(value), 'Requests']}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={20} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
