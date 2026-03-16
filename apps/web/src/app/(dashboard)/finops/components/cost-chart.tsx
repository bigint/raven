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
import { formatShortDate } from "@/lib/format";
import type { DailyCost } from "../hooks/use-finops";

interface CostChartProps {
  data: DailyCost[];
}

export const CostChart = ({ data }: CostChartProps) => {
  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      <h2 className="mb-4 text-base font-semibold">Daily Costs</h2>
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
            tickFormatter={(v) => `$${v}`}
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
            formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
            labelFormatter={(label) => formatShortDate(String(label))}
          />
          <Bar
            dataKey="cost"
            fill="#22c55e"
            name="Cost"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
