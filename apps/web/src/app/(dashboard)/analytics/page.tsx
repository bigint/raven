"use client";

import { TokenBreakdown } from "./components/token-breakdown";
import { UsageCharts } from "./components/usage-charts";
import { useAnalytics } from "./hooks/use-analytics";

const AnalyticsPage = () => {
  const {
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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <UsageCharts
        stats={stats}
        loading={isLoading}
        dateRange={dateRange}
        dateRangeOptions={dateRangeOptions}
        onDateRangeChange={setDateRange}
      />

      <TokenBreakdown usage={usage} loading={isLoading} />
    </div>
  );
};

export default AnalyticsPage;
