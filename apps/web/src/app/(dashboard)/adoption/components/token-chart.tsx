"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ChartDataPoint } from "../hooks/use-adoption";

interface TokenChartProps {
  data: ChartDataPoint[];
}

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const TokenChart = ({ data }: TokenChartProps) => {
  if (data.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="date"
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={formatDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={formatNumber}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            formatter={(value) => Number(value).toLocaleString()}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          />
          <Bar dataKey="cached" fill="#3b82f6" name="Cached" stackId="tokens" />
          <Bar dataKey="input" fill="#22c55e" name="Input" stackId="tokens" />
          <Bar dataKey="output" fill="#ef4444" name="Output" stackId="tokens" />
          <Bar
            dataKey="reasoning"
            fill="#a855f7"
            name="Reasoning"
            radius={[4, 4, 0, 0]}
            stackId="tokens"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
