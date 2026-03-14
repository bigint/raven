"use client";

import { PageHeader, PillTabs, Spinner } from "@raven/ui";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { ToolChart } from "./components/tool-chart";
import { ToolSessionsTable } from "./components/tool-sessions-table";
import { useTools } from "./hooks/use-tools";

const ToolsPage = () => {
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
    <div>
      <PageHeader
        description="Sessions with tool use activity. View tool call breakdowns by type for each session."
        title="Tool Use"
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

      <ToolChart data={chartData} />

      <ToolSessionsTable
        loading={isLoading}
        sessions={sessions}
      />

      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isFetchingNextPage && <Spinner className="size-5" />}
        </div>
      )}
    </div>
  );
};

export default ToolsPage;
