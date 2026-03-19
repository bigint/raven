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
import { formatCompactNumber, formatShortDate } from "@/lib/format";
import type { ChartDataPoint } from "../hooks/use-adoption";

interface TokenChartProps {
  readonly data: ChartDataPoint[];
  readonly title?: string;
}

export const TokenChart = ({ data, title }: TokenChartProps) => {
  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      {title && (
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          {title}
        </h3>
      )}
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
            tickFormatter={formatShortDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={formatCompactNumber}
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
            labelFormatter={(label) => formatShortDate(String(label))}
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
