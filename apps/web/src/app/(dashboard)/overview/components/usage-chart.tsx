"use client";

import { Meter } from "@base-ui/react/meter";
import { PROVIDER_LABELS } from "@raven/types";
import { ArrowRight, Network, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { UsageRow } from "../hooks/use-overview";

interface UsageChartProps {
  readonly usage: UsageRow[];
  readonly totalRequests: number;
  readonly loading: boolean;
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div className="h-10 animate-pulse rounded-lg bg-muted" key={i} />
    ))}
  </div>
);

const EmptyState = () => (
  <div className="py-6 text-center">
    <Network className="mx-auto size-8 text-muted-foreground/30" />
    <p className="mt-2 text-sm text-muted-foreground">No usage data yet</p>
  </div>
);

export const UsageChart = ({
  usage,
  totalRequests,
  loading
}: UsageChartProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <TrendingUp className="size-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold">Usage by Provider</h2>
      </div>
      <Link
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        href="/analytics"
      >
        View all
        <ArrowRight className="size-3" />
      </Link>
    </div>
    <div className="px-4 py-4 sm:px-6">
      {loading ? (
        <LoadingSkeleton />
      ) : usage.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {usage.slice(0, 5).map((row, idx) => (
            <Meter.Root
              key={`${row.provider}-${row.model}-${idx}`}
              max={totalRequests}
              min={0}
              value={Math.max(Number(row.totalRequests), totalRequests * 0.02)}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Meter.Label className="font-medium">
                    {row.providerConfigName ? (
                      <>
                        {row.providerConfigName}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {PROVIDER_LABELS[row.provider] ?? row.provider}
                        </span>
                      </>
                    ) : (
                      (PROVIDER_LABELS[row.provider] ?? row.provider)
                    )}
                  </Meter.Label>
                  <span className="text-muted-foreground">{row.model}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {Number(row.totalRequests).toLocaleString()}
                </span>
              </div>
              <Meter.Track className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                <Meter.Indicator className="h-full rounded-full bg-primary/60" />
              </Meter.Track>
            </Meter.Root>
          ))}
        </div>
      )}
    </div>
  </div>
);
