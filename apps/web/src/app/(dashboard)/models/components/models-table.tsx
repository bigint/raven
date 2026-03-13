"use client";

import { PROVIDER_LABELS } from "@raven/types";
import { Spinner } from "@raven/ui";
import { Cpu } from "lucide-react";
import { ModelIcon, ProviderIcon } from "@/components/model-icon";
import type { ModelRow } from "../hooks/use-models";

interface ModelsTableProps {
  data: ModelRow[];
  loading: boolean;
}

const formatTimeAgo = (ts: string | null): string => {
  if (!ts) return "\u2014";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const ModelsTable = ({ data, loading }: ModelsTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">Loading models...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Cpu className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No model usage data yet.
        </p>
      </div>
    );
  }

  return (
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
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cost
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg Latency
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last Used
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              className={`transition-colors hover:bg-muted/30 ${idx !== data.length - 1 ? "border-b border-border" : ""}`}
              key={`${row.provider}-${row.model}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-2 font-medium">
                  <ModelIcon model={row.model} provider={row.provider} />
                  {row.model}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ProviderIcon provider={row.provider} />
                  {PROVIDER_LABELS[row.provider] ?? row.provider}
                </div>
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.requests.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.inputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.outputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.cachedTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.reasoningTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                ${Number(row.totalCost).toFixed(4)}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {Math.round(row.avgLatencyMs)}ms
              </td>
              <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                {formatTimeAgo(row.lastUsed)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
