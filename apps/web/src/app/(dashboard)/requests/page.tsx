"use client";

import { Button, PageHeader, Spinner } from "@raven/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useState } from "react";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { api } from "@/lib/api";
import { RequestFilters } from "./components/request-filters";
import { RequestTable } from "./components/request-table";
import {
  type DateRange,
  type RequestsResponse,
  buildRequestsUrl,
  useLiveRequests
} from "./hooks/use-requests";

const RequestsPage = () => {
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
    queryKey: ["requests", { provider, range: dateRange, status: statusFilter }],
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
  const displayError = isLive
    ? live.error
    : (query.error?.message ?? null);

  const sentinelRef = useInfiniteScroll(
    () => query.fetchNextPage(),
    !isLive && query.hasNextPage && !query.isFetchingNextPage
  );

  const toggleLive = () => {
    setIsLive((prev) => !prev);
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button
            className={
              isLive
                ? "bg-green-500/10 text-green-600 border border-green-500/30 hover:opacity-100"
                : ""
            }
            onClick={toggleLive}
            variant={isLive ? "primary" : "secondary"}
          >
            <Radio className={`size-4 ${isLive ? "animate-pulse" : ""}`} />
            {isLive ? "Live" : "Go Live"}
          </Button>
        }
        description="View and inspect API request logs."
        title="Requests"
      />

      {!isLive && (
        <RequestFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onProviderChange={setProvider}
          onStatusChange={setStatusFilter}
          provider={provider}
          statusFilter={statusFilter}
          total={total}
        />
      )}

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
        <div ref={sentinelRef} className="flex justify-center py-6">
          {query.isFetchingNextPage && <Spinner className="size-5" />}
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
