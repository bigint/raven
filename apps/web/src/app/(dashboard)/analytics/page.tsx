"use client";

import { CacheStats } from "./components/cache-stats";
import { TokenBreakdown } from "./components/token-breakdown";
import { UsageCharts } from "./components/usage-charts";
import { useAnalytics } from "./hooks/use-analytics";

const AnalyticsPage = () => {
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
    <div>
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

      <CacheStats cache={cache} loading={isLoading} />

      <TokenBreakdown loading={isLoading} usage={usage} />
    </div>
  );
};

export default AnalyticsPage;
