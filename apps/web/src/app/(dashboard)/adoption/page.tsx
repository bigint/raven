"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { useState } from "react";
import { TokenChart } from "./components/token-chart";
import { UsageBars } from "./components/usage-bars";
import { UsageTable } from "./components/usage-table";
import { type GroupBy, useAdoption } from "./hooks/use-adoption";

type ViewTab = "table" | "bars";
type MetricKey = "inputTokens" | "outputTokens" | "cachedTokens" | "requests";

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { label: "Input Tokens", value: "inputTokens" },
  { label: "Output Tokens", value: "outputTokens" },
  { label: "Cached Tokens", value: "cachedTokens" },
  { label: "Requests", value: "requests" }
];

const AdoptionPage = () => {
  const {
    breakdownData,
    chartData,
    dateRange,
    dateRangeOptions,
    error,
    groupBy,
    groupByOptions,
    isLoading,
    setDateRange,
    setGroupBy
  } = useAdoption();

  const [viewTab, setViewTab] = useState<ViewTab>("table");
  const [metric, setMetric] = useState<MetricKey>("inputTokens");

  return (
    <div>
      <PageHeader
        description="Top users and usage statistics."
        title="Adoption"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
        {dateRangeOptions.map((opt) => (
          <button
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <TokenChart data={chartData} />

      <Tabs
        onChange={(v) => setViewTab(v as ViewTab)}
        tabs={[
          { label: "Summary", value: "table" },
          { label: "Usage Breakdown", value: "bars" }
        ]}
        value={viewTab}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Group by:</span>
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {groupByOptions.map((opt) => (
              <button
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  groupBy === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={opt.value}
                onClick={() => setGroupBy(opt.value as GroupBy)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {viewTab === "bars" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Metric:</span>
            <select
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              value={metric}
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {viewTab === "table" ? (
        <UsageTable
          data={breakdownData}
          groupBy={groupBy}
          loading={isLoading}
        />
      ) : (
        <UsageBars data={breakdownData} metric={metric} />
      )}
    </div>
  );
};

export default AdoptionPage;
