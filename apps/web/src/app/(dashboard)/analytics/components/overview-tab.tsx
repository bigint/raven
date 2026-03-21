"use client";

import { useAnalytics } from "../hooks/use-analytics";
import { CacheStats } from "./cache-stats";
import { TokenBreakdown } from "./token-breakdown";
import { TokenStats } from "./token-stats";
import { UsageCharts } from "./usage-charts";

export const OverviewTab = ({ keyId }: { keyId?: string }) => {
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
