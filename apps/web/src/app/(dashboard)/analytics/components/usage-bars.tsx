"use client";

import { formatCompactNumber } from "@/lib/format";
import { Meter } from "@base-ui/react/meter";
import type { BreakdownRow } from "../hooks/use-adoption";

interface UsageBarsProps {
  readonly data: BreakdownRow[];
  readonly metric: "inputTokens" | "outputTokens" | "cachedTokens" | "requests";
}

export const UsageBars = ({ data, metric }: UsageBarsProps) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((row) => row[metric]));

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const value = row[metric];

        return (
          <Meter.Root
            className="rounded-lg border border-border p-4"
            key={row.label}
            max={maxValue}
            min={0}
            value={value}
          >
            <div className="mb-2 flex items-center justify-between">
              <Meter.Label className="text-sm font-medium">
                {row.label}
              </Meter.Label>
              <Meter.Value className="text-sm tabular-nums text-muted-foreground">
                {() => formatCompactNumber(value)}
              </Meter.Value>
            </div>
            <Meter.Track className="h-2 w-full rounded-full bg-muted">
              <Meter.Indicator className="h-2 rounded-full bg-primary transition-all" />
            </Meter.Track>
          </Meter.Root>
        );
      })}
    </div>
  );
};
