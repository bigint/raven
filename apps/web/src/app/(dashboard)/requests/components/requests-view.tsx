"use client";

import { Spinner } from "@raven/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import {
  buildRequestsUrl,
  type DateRange,
  type RequestsResponse,
  useLiveRequests
} from "../hooks/use-requests";
import { RequestFilters } from "./request-filters";
import { RequestTable } from "./request-table";

export const RequestsView = () => {
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
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
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
