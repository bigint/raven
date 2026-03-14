"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ToolDailyStats } from "../hooks/use-tools";

interface ToolChartProps {
  data: ToolDailyStats[];
}

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const ToolChart = ({ data }: ToolChartProps) => {
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
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Bar
            dataKey="totalToolUses"
            fill="#3b82f6"
            name="Tool Uses"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
