"use client";

import type { Plan } from "@raven/types";
import { PLAN_FEATURES } from "@raven/types";
import { PageHeader, PillTabs, Spinner, Tabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { subscriptionQueryOptions } from "@/app/(dashboard)/billing/hooks/use-billing";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { CacheStats } from "./components/cache-stats";
import { ModelsTable } from "./components/models-table";
import { TokenBreakdown } from "./components/token-breakdown";
import { TokenChart } from "./components/token-chart";
import { TokenStats } from "./components/token-stats";
import { ToolChart } from "./components/tool-chart";
import { ToolSessionsTable } from "./components/tool-sessions-table";
import { UsageBars } from "./components/usage-bars";
import { UsageCharts } from "./components/usage-charts";
import { UsageTable } from "./components/usage-table";
import { type GroupBy, useAdoption } from "./hooks/use-adoption";
import { useAnalytics } from "./hooks/use-analytics";
import { useModels } from "./hooks/use-models";
import { useTools } from "./hooks/use-tools";

type AnalyticsTab = "overview" | "models" | "tools" | "adoption";

type MetricKey = "inputTokens" | "outputTokens" | "cachedTokens" | "requests";

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { label: "Input Tokens", value: "inputTokens" },
  { label: "Output Tokens", value: "outputTokens" },
  { label: "Cached Tokens", value: "cachedTokens" },
  { label: "Requests", value: "requests" }
];

const OverviewTab = () => {
  const {
    cache,
    stats,
    usage,
    isLoading,
    error,
    dateRange,
    dateRangeOptions,
    setDateRange
  } = useAnalytics();

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <UsageCharts
        dateRange={dateRange}
        dateRangeOptions={dateRangeOptions}
        loading={isLoading}
        onDateRangeChange={setDateRange}
        stats={stats}
      />
      <TokenStats loading={isLoading} stats={stats} />
      <CacheStats cache={cache} loading={isLoading} />
      <TokenBreakdown loading={isLoading} usage={usage} />
    </>
  );
};

const ModelsTab = () => {
  const { data, dateRange, dateRangeOptions, error, isLoading, setDateRange } =
    useModels();

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
      <ModelsTable data={data} loading={isLoading} />
    </>
  );
};

const ToolsTab = () => {
  const {
    chartData,
    dateRange,
    dateRangeOptions,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    sessions,
    setDateRange
  } = useTools();

  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage && !isFetchingNextPage
  );

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
      <ToolChart data={chartData} />
      <ToolSessionsTable loading={isLoading} sessions={sessions} />
      {hasNextPage && (
        <div className="flex justify-center py-6" ref={sentinelRef}>
          {isFetchingNextPage && <Spinner className="size-5" />}
        </div>
      )}
    </>
  );
};

const AdoptionTab = () => {
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

  const [viewTab, setViewTab] = useState<"table" | "bars">("table");
  const [metric, setMetric] = useState<MetricKey>("inputTokens");

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
      <TokenChart data={chartData} />
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
    </>
  );
};

const TAB_DESCRIPTIONS: Record<AnalyticsTab, string> = {
  adoption: "Top users and usage statistics.",
  models: "Model usage analytics across all providers.",
  overview: "Token usage, costs, and cache performance.",
  tools: "Tool call activity and session breakdowns."
};

const AnalyticsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: subscription } = useQuery(subscriptionQueryOptions());
  const plan = (subscription?.planId as Plan) ?? "free";
  const hasAdoption = PLAN_FEATURES[plan].hasAdoption;

  const tab = (searchParams.get("tab") as AnalyticsTab) ?? "overview";
  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

  const tabs = useMemo(() => {
    const base = [
      { label: "Overview", value: "overview" },
      { label: "Models", value: "models" },
      { label: "Tools", value: "tools" }
    ];
    if (hasAdoption) {
      base.push({ label: "Adoption", value: "adoption" });
    }
    return base;
  }, [hasAdoption]);

  return (
    <div>
      <PageHeader description={TAB_DESCRIPTIONS[tab]} title="Analytics" />

      <Tabs onChange={setTab} tabs={tabs} value={tab} />

      {tab === "overview" && <OverviewTab />}
      {tab === "models" && <ModelsTab />}
      {tab === "tools" && <ToolsTab />}
      {tab === "adoption" && hasAdoption && <AdoptionTab />}
    </div>
  );
};

export default AnalyticsPage;
