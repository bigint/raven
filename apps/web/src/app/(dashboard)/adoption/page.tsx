"use client";

import { PageHeader, PillTabs, Tabs } from "@raven/ui";
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

      <PillTabs
        className="mb-6"
        onChange={setDateRange}
        options={dateRangeOptions}
        value={dateRange}
      />

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
          <PillTabs
            onChange={(v) => setGroupBy(v as GroupBy)}
            options={groupByOptions}
            value={groupBy}
          />
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
