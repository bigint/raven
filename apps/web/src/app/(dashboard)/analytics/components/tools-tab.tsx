"use client";

import { PillTabs, Spinner } from "@raven/ui";
import dynamic from "next/dynamic";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { ToolSessionsTable } from "./tool-sessions-table";
import { useTools } from "../hooks/use-tools";

const ToolChart = dynamic(
  () =>
    import("./tool-chart").then((m) => ({ default: m.ToolChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border">
        <Spinner />
      </div>
    )
  }
);

export const ToolsTab = ({ keyId }: { keyId?: string }) => {
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
