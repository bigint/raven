"use client";

import { PageHeader, PillTabs, Spinner, Tabs } from "@raven/ui";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { LogsTable } from "./components/logs-table";
import { RequestDetail } from "./components/request-detail";
import { RequestFilters } from "./components/request-filters";
import { RequestTable } from "./components/request-table";
import {
  type SessionRequest,
  sessionDetailQueryOptions,
  useLogs
} from "./hooks/use-logs";
import {
  buildRequestsUrl,
  type DateRange,
  type RequestsResponse,
  useLiveRequests
} from "./hooks/use-requests";

type View = "requests" | "sessions";

const RequestsView = () => {
  const [provider, setProvider] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("24h");
  const [isLive, setIsLive] = useState(false);

  const query = useInfiniteQuery({
    enabled: !isLive,
    getNextPageParam: (lastPage: RequestsResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<RequestsResponse>(
        buildRequestsUrl({
          page: pageParam as number,
          provider,
          range: dateRange,
          status: statusFilter
        })
      ),
    queryKey: [
      "requests",
      { provider, range: dateRange, status: statusFilter }
    ],
    refetchInterval: isLive ? false : 30_000
  });

  const live = useLiveRequests(isLive);
  const requests = isLive
    ? live.requests
    : (query.data?.pages.flatMap((p) => p.data) ?? []);
  const total = isLive
    ? live.total
    : (query.data?.pages[0]?.pagination?.total ?? 0);
  const loading = isLive ? live.isLoading : query.isPending;
  const displayError = isLive ? live.error : (query.error?.message ?? null);

  const sentinelRef = useInfiniteScroll(
    () => query.fetchNextPage(),
    !isLive && query.hasNextPage && !query.isFetchingNextPage
  );

  return (
    <>
      <RequestFilters
        dateRange={dateRange}
        isLive={isLive}
        onDateRangeChange={setDateRange}
        onProviderChange={setProvider}
        onStatusChange={setStatusFilter}
        onToggleLive={() => setIsLive((prev) => !prev)}
        provider={provider}
        statusFilter={statusFilter}
        total={total}
      />

      {isLive && (
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-sm text-muted-foreground">
            Streaming live — {requests.length} requests
          </span>
        </div>
      )}

      {displayError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {displayError}
        </div>
      )}

      <RequestTable
        animateRows={isLive}
        emptyMessage={
          isLive
            ? "Waiting for new requests..."
            : "No requests found for the selected filters."
        }
        loading={loading}
        loadingMessage={
          isLive ? "Connecting to live stream..." : "Loading requests..."
        }
        requests={requests}
      />

      {!isLive && query.hasNextPage && (
        <div className="flex justify-center py-6" ref={sentinelRef}>
          {query.isFetchingNextPage && <Spinner className="size-5" />}
        </div>
      )}
    </>
  );
};

const SessionsView = () => {
  const {
    customFrom,
    customTo,
    data,
    dateRange,
    dateRangeOptions,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    pageSize,
    setCustomRange,
    setDateRange,
    setPageSize
  } = useLogs();

  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(
    null
  );
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");

  const { data: sessionDetail } = useQuery({
    ...sessionDetailQueryOptions(activeSessionId),
    enabled: !!activeSessionId
  });

  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage && !isFetchingNextPage
  );

  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    for (const session of data) {
      for (const model of session.models) {
        models.add(model);
      }
    }
    return Array.from(models).sort();
  }, [data]);

  const filteredData = useMemo(
    () =>
      modelFilter
        ? data.filter((session) => session.models.includes(modelFilter))
        : data,
    [data, modelFilter]
  );

  const handleRequestClick = (requestId: string, sessionId: string) => {
    setActiveSessionId(sessionId);
    const requests = sessionDetail ?? [];
    const req = requests.find((r) => r.id === requestId);
    if (req) {
      setSelectedRequest(req);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <PillTabs
          onChange={setDateRange}
          options={dateRangeOptions}
          value={dateRange}
        />

        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => setCustomRange(e.target.value, customTo)}
              type="date"
              value={customFrom}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              min={customFrom}
              onChange={(e) => setCustomRange(customFrom, e.target.value)}
              type="date"
              value={customTo}
            />
          </div>
        )}

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setModelFilter(e.target.value)}
          value={modelFilter}
        >
          <option value="">All Models</option>
          {uniqueModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <LogsTable
        data={filteredData}
        loading={isLoading}
        onRequestClick={handleRequestClick}
      />

      <div className="mt-4 flex items-center gap-2">
        <label
          className="text-sm text-muted-foreground"
          htmlFor="page-size-select"
        >
          Rows per page
        </label>
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          id="page-size-select"
          onChange={(e) => setPageSize(Number(e.target.value))}
          value={pageSize}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {hasNextPage && (
        <div className="flex justify-center py-6" ref={sentinelRef}>
          {isFetchingNextPage && <Spinner className="size-5" />}
        </div>
      )}

      <RequestDetail
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />
    </>
  );
};

const RequestsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const view = (searchParams.get("view") as View) ?? "requests";
  const setView = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div>
      <PageHeader
        description={
          view === "requests"
            ? "View and inspect individual API requests."
            : "View sessions grouped by conversation."
        }
        title="Requests"
      />

      <Tabs
        onChange={setView}
        tabs={[
          { label: "Requests", value: "requests" },
          { label: "Sessions", value: "sessions" }
        ]}
        value={view}
      />

      {view === "requests" ? <RequestsView /> : <SessionsView />}
    </div>
  );
};

export default RequestsPage;
