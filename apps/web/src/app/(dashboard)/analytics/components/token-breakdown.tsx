"use client";

import { PROVIDER_LABELS } from "@raven/types";
import { EmptyState, Spinner } from "@raven/ui";
import { BarChart3 } from "lucide-react";
import { ModelIcon } from "@/components/model-icon";
import type { UsageRow } from "../hooks/use-analytics";

interface TokenBreakdownProps {
  readonly usage: UsageRow[];
  readonly loading: boolean;
}

const LoadingState = () => (
  <div className="rounded-xl border border-border p-12 text-center">
    <Spinner className="mx-auto" />
    <p className="mt-3 text-sm text-muted-foreground">Loading analytics...</p>
  </div>
);

export const TokenBreakdown = ({ usage, loading }: TokenBreakdownProps) => (
  <div>
    <h2 className="mb-4 text-base font-semibold">Metrics by Model</h2>
    {loading ? (
      <LoadingState />
    ) : usage.length === 0 ? (
      <EmptyState
        icon={<BarChart3 className="size-8" />}
        title="No usage data yet"
      />
    ) : (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Model
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requests
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Input
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Output
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cached
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reasoning
              </th>
            </tr>
          </thead>
          <tbody>
            {usage.map((row, idx) => (
              <tr
                className={`transition-colors hover:bg-muted/30 ${idx === usage.length - 1 ? "" : "border-b border-border"}`}
                key={`${row.provider}-${row.model}-${idx}`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 font-medium">
                    <ModelIcon model={row.model} provider={row.provider} />
                    {row.model}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {row.providerConfigName ??
                      PROVIDER_LABELS[row.provider] ??
                      row.provider}
                  </div>
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {Number(row.totalRequests).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {Number(row.totalInputTokens).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {Number(row.totalOutputTokens).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {Number(row.totalCachedTokens).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {Number(row.totalReasoningTokens).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
