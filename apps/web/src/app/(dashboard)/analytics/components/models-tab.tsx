"use client";

import { Button, PillTabs } from "@raven/ui";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { useModels } from "../hooks/use-models";
import { ModelsTable } from "./models-table";

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
        (Number(row.totalCost) || 0).toFixed(4),
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
        <Button
          disabled={isLoading || data.length === 0}
          onClick={handleExportCsv}
          title="Export as CSV"
          variant="secondary"
        >
          <Download className="size-4" />
          <span>Export</span>
        </Button>
      </div>
      <ModelsTable data={data} loading={isLoading} />
    </>
  );
};
