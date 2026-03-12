"use client";

import { ArrowRight, Network, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { UsageRow } from "../hooks/use-overview";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  azure: "Azure",
  cohere: "Cohere",
  google: "Google",
  mistral: "Mistral",
  openai: "OpenAI"
};

interface UsageChartProps {
  usage: UsageRow[];
  totalRequests: number;
  loading: boolean;
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

export const UsageChart = ({ usage, totalRequests, loading }: UsageChartProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
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
    <div className="px-6 py-4">
      {loading ? (
        <LoadingSkeleton />
      ) : usage.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {usage.slice(0, 5).map((row) => {
            const pct =
              totalRequests > 0
                ? (Number(row.totalRequests) / totalRequests) * 100
                : 0;
            return (
              <div key={`${row.provider}-${row.model}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {PROVIDER_LABELS[row.provider] ?? row.provider}
                    </span>
                    <span className="text-muted-foreground">{row.model}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(row.totalRequests).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
