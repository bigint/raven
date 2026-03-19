"use client";

import type { Plan } from "@raven/types";
import { PLAN_FEATURES } from "@raven/types";
import { Button, PageHeader, PillTabs, Select, Spinner, Tabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Download, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { match } from "ts-pattern";
import { subscriptionQueryOptions } from "@/app/(dashboard)/billing/hooks/use-billing";
import { keysQueryOptions } from "@/app/(dashboard)/keys/hooks/use-keys";
import { exportToCsv } from "@/lib/csv-export";
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

const OverviewTab = ({ keyId }: { keyId?: string }) => {
  const {
    cache,
    customFrom,
    customTo,
    stats,
    usage,
    dateRange,
    dateRangeOptions,
    setCustomRange,
    setDateRange
  } = useAnalytics(keyId);

  return (
    <>
      {stats.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {stats.error.message}
        </div>
      )}
      <UsageCharts
        customFrom={customFrom}
        customTo={customTo}
        dateRange={dateRange}
        dateRangeOptions={dateRangeOptions}
        loading={stats.isPending}
        onCustomRangeChange={setCustomRange}
        onDateRangeChange={setDateRange}
        stats={stats.data ?? null}
      />
      {usage.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {usage.error.message}
        </div>
      )}
      <TokenStats loading={stats.isPending} stats={stats.data ?? null} />
      {cache.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {cache.error.message}
        </div>
      )}
      <CacheStats cache={cache.data ?? null} loading={cache.isPending} />
      <TokenBreakdown loading={usage.isPending} usage={usage.data ?? []} />
    </>
  );
};

const ModelsTab = ({ keyId }: { keyId?: string }) => {
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

const ToolsTab = ({ keyId }: { keyId?: string }) => {
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
  } = useTools(keyId);

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

const AdoptionTab = ({ keyId }: { keyId?: string }) => {
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
      <TokenChart data={chartData} title={CHART_METRIC_TITLES[chartMetric]} />
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

const TAB_DESCRIPTIONS: Record<AnalyticsTab, string> = {
  adoption: "Top users and usage statistics.",
  models: "Model usage analytics across all providers.",
  overview: "Token usage, costs, and cache performance.",
  tools: "Tool call activity and session breakdowns."
};

const KeyFilterBanner = ({ keyId }: { keyId: string }) => {
  const { data: keys } = useQuery(keysQueryOptions());
  const keyName = keys?.find((k) => k.id === keyId)?.name ?? keyId;

  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted/50 px-4 py-3">
      <span className="text-sm text-muted-foreground">
        Filtered by key:{" "}
        <span className="font-medium text-foreground">{keyName}</span>
      </span>
      <Link href="/analytics">
        <Button size="sm" variant="ghost">
          <X className="size-4" />
          Clear filter
        </Button>
      </Link>
    </div>
  );
};

const AnalyticsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: subscription } = useQuery(subscriptionQueryOptions());
  const plan = (subscription?.planId as Plan) ?? "free";
  const hasAdoption = PLAN_FEATURES[plan].hasAdoption;

  const keyId = searchParams.get("keyId") ?? undefined;

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

      {keyId && <KeyFilterBanner keyId={keyId} />}

      <Tabs onChange={setTab} tabs={tabs} value={tab} />

      {match(tab)
        .with("overview", () => <OverviewTab keyId={keyId} />)
        .with("models", () => <ModelsTab keyId={keyId} />)
        .with("tools", () => <ToolsTab keyId={keyId} />)
        .with("adoption", () =>
          hasAdoption ? <AdoptionTab keyId={keyId} /> : null
        )
        .otherwise(() => null)}
    </div>
  );
};

export default AnalyticsPage;
