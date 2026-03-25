"use client";

import { PROVIDER_LABELS } from "@raven/types";
import { Button, Spinner, Tooltip } from "@raven/ui";
import { Check, Copy, Cpu } from "lucide-react";
import { ModelIcon } from "@/components/model-icon";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { formatTimeAgo } from "@/lib/format";
import type { ModelRow } from "../hooks/use-models";

const CopyableId = ({ value }: { value: string }) => {
  const { copied, copy } = useCopyToClipboard(1500);

  const handleCopy = () => {
    copy(value);
  };

  return (
    <Tooltip content="Copy model ID">
      <Button
        className="group/copy mt-0.5 font-mono text-xs px-0 py-0 h-auto"
        onClick={handleCopy}
        variant="ghost"
      >
        {value}
        {copied ? (
          <Check className="size-3 text-success" />
        ) : (
          <Copy className="size-3 opacity-0 group-hover/copy:opacity-100" />
        )}
      </Button>
    </Tooltip>
  );
};

interface ModelsTableProps {
  readonly data: ModelRow[];
  readonly loading: boolean;
}

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
              className={`transition-colors hover:bg-muted/30 ${idx === data.length - 1 ? "" : "border-b border-border"}`}
              key={`${row.provider}-${row.model}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-2 font-medium">
                  <ModelIcon model={row.model} provider={row.provider} />
                  {row.model}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {PROVIDER_LABELS[row.provider] ?? row.provider}
                </div>
                <CopyableId value={row.model} />
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
                ${(Number(row.totalCost) || 0).toFixed(4)}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {Math.round(row.avgLatencyMs)}
                {"\u00A0"}ms
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
