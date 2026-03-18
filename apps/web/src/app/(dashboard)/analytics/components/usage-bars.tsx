"use client";

import { formatCompactNumber } from "@/lib/format";
import type { BreakdownRow } from "../hooks/use-adoption";

interface UsageBarsProps {
  data: BreakdownRow[];
  metric: "inputTokens" | "outputTokens" | "cachedTokens" | "requests";
}

export const UsageBars = ({ data, metric }: UsageBarsProps) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((row) => row[metric]));

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const value = row[metric];
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <div className="rounded-lg border border-border p-4" key={row.label}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatCompactNumber(value)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
