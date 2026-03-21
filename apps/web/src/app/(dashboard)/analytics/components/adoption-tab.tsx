"use client";

import { PillTabs, Select, Spinner, Tabs } from "@raven/ui";
import dynamic from "next/dynamic";
import { useState } from "react";
import { type GroupBy, useAdoption } from "../hooks/use-adoption";
import { UsageBars } from "./usage-bars";
import { UsageTable } from "./usage-table";

const TokenChart = dynamic(
  () => import("./token-chart").then((m) => ({ default: m.TokenChart })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border">
        <Spinner />
      </div>
    ),
    ssr: false
  }
);

type MetricKey = "inputTokens" | "outputTokens" | "cachedTokens" | "requests";

type ChartMetric = "tokens" | "cost" | "requests";

const CHART_METRIC_OPTIONS: { value: ChartMetric; label: string }[] = [
  { label: "Tokens", value: "tokens" },
  { label: "Cost", value: "cost" },
  { label: "Requests", value: "requests" }
];

const CHART_METRIC_TITLES: Record<ChartMetric, string> = {
  cost: "Cost Over Time",
  requests: "Requests Over Time",
  tokens: "Tokens Over Time"
};

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { label: "Input Tokens", value: "inputTokens" },
  { label: "Output Tokens", value: "outputTokens" },
  { label: "Cached Tokens", value: "cachedTokens" },
  { label: "Requests", value: "requests" }
];

export const AdoptionTab = ({ keyId }: { keyId?: string }) => {
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
  } = useAdoption(keyId);

  const [viewTab, setViewTab] = useState<"table" | "bars">("table");
  const [metric, setMetric] = useState<MetricKey>("inputTokens");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("tokens");

  return (
    <>
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
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">View:</span>
        <PillTabs
          onChange={setChartMetric}
          options={CHART_METRIC_OPTIONS}
          value={chartMetric}
        />
      </div>
      <TokenChart
        data={chartData}
        metric={chartMetric}
        title={CHART_METRIC_TITLES[chartMetric]}
      />
      <Tabs
        onChange={(v) => setViewTab(v as "table" | "bars")}
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
            <Select
              onChange={(val) => setMetric(val as MetricKey)}
              options={METRIC_OPTIONS}
              value={metric}
            />
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
    </>
  );
};
