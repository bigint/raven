"use client";

import type { UsageRow } from "../hooks/use-analytics";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  azure: "Azure",
  cohere: "Cohere",
  google: "Google",
  mistral: "Mistral",
  openai: "OpenAI"
};

interface TokenBreakdownProps {
  usage: UsageRow[];
  loading: boolean;
}

const LoadingState = () => (
  <div className="rounded-xl border border-border p-12 text-center">
    <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    <p className="mt-3 text-sm text-muted-foreground">Loading analytics...</p>
  </div>
);

const EmptyState = () => (
  <div className="rounded-xl border border-border p-12 text-center">
    <p className="text-muted-foreground">No usage data for this period.</p>
  </div>
);

export const TokenBreakdown = ({ usage, loading }: TokenBreakdownProps) => (
  <div>
    <h2 className="mb-4 text-base font-semibold">
      Usage by Provider & Model
    </h2>
    {loading ? (
      <LoadingState />
    ) : usage.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Provider
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Model
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requests
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cost
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tokens
              </th>
            </tr>
          </thead>
          <tbody>
            {usage.map((row, idx) => (
              <tr
                className={`transition-colors hover:bg-muted/30 ${idx !== usage.length - 1 ? "border-b border-border" : ""}`}
                key={`${row.provider}-${row.model}`}
              >
                <td className="px-5 py-4 font-medium">
                  {PROVIDER_LABELS[row.provider] ?? row.provider}
                </td>
                <td className="px-5 py-4 font-mono text-sm text-muted-foreground">
                  {row.model}
                </td>
                <td className="px-5 py-4 text-right">
                  {Number(row.totalRequests).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right">
                  ${Number(row.totalCost).toFixed(4)}
                </td>
                <td className="px-5 py-4 text-right">
                  {(
                    Number(row.totalInputTokens) +
                    Number(row.totalOutputTokens)
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
