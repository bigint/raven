"use client";

import { Spinner } from "@raven/ui";
import { BarChart2 } from "lucide-react";
import { ModelIcon } from "@/components/model-icon";
import type { BreakdownRow } from "../hooks/use-adoption";

interface UsageTableProps {
  data: BreakdownRow[];
  loading: boolean;
  groupBy?: "key" | "model" | "userAgent";
}

export const UsageTable = ({ data, loading, groupBy }: UsageTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading usage data...
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <BarChart2 className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No usage data yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cached Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Input Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Output Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reasoning Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Requests
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              className={`transition-colors hover:bg-muted/30 ${idx === data.length - 1 ? "" : "border-b border-border"}`}
              key={row.label}
            >
              <td className="px-5 py-4 font-medium text-primary">
                <span className="inline-flex items-center gap-2">
                  {groupBy === "model" && (
                    <ModelIcon model={row.label} size={16} />
                  )}
                  {row.label}
                </span>
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.cachedTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.inputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.outputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.reasoningTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.requests.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
