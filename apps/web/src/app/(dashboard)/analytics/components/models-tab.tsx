"use client";

import { PillTabs } from "@raven/ui";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { ModelsTable } from "./models-table";
import { useModels } from "../hooks/use-models";

export const ModelsTab = ({ keyId }: { keyId?: string }) => {
  const { data, dateRange, dateRangeOptions, error, isLoading, setDateRange } =
    useModels(keyId);

  const handleExportCsv = () => {
    exportToCsv(
      `models-${dateRange}.csv`,
      [
        "Model",
        "Provider",
        "Requests",
        "Input Tokens",
        "Output Tokens",
        "Cached Tokens",
        "Reasoning Tokens",
        "Cost",
        "Avg Latency (ms)",
        "Last Used"
      ],
      data.map((row) => [
        row.model,
        row.provider,
        row.requests,
        row.inputTokens,
        row.outputTokens,
        row.cachedTokens,
        row.reasoningTokens,
        Number(row.totalCost).toFixed(4),
        Math.round(row.avgLatencyMs),
        row.lastUsed ?? ""
      ])
    );
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="mb-6 flex items-center gap-3">
        <PillTabs
          onChange={setDateRange}
          options={dateRangeOptions}
          value={dateRange}
        />
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={isLoading || data.length === 0}
          onClick={handleExportCsv}
          title="Export as CSV"
          type="button"
        >
          <Download className="size-4" />
          <span>Export</span>
        </button>
      </div>
      <ModelsTable data={data} loading={isLoading} />
    </>
  );
};
