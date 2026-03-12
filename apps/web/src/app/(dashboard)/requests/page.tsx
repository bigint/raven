"use client";

import { Button, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { RequestFilters } from "./components/request-filters";
import { RequestTable } from "./components/request-table";
import {
  type DateRange,
  requestsQueryOptions,
  useLiveRequests
} from "./hooks/use-requests";

const RequestsPage = () => {
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("24h");
  const [isLive, setIsLive] = useState(false);
  const [hasNewData, setHasNewData] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    ...requestsQueryOptions({
      page,
      provider,
      range: dateRange,
      status: statusFilter
    }),
    enabled: !isLive
  });

  const live = useLiveRequests(isLive);
  const requests = isLive ? live.requests : (data?.data ?? []);
  const total = isLive ? live.total : (data?.pagination.total ?? 0);
  const loading = isLive ? live.isLoading : isLoading;
  const displayError = isLive ? live.error : (error?.message ?? null);

  useEventStream({
    enabled: !isLive,
    events: ["request.created"],
    onEvent: () => setHasNewData(true)
  });
  useEffect(
    () => setHasNewData(false),
    [page, provider, statusFilter, dateRange]
  );

  const handleFilterChange = (
    setter: (value: string) => void,
    value: string
  ) => {
    setter(value);
    setPage(1);
  };
  const toggleLive = () => {
    setIsLive((prev) => !prev);
    setPage(1);
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
          onDateRangeChange={(v) => {
            setDateRange(v);
            setPage(1);
          }}
          onProviderChange={(v) => handleFilterChange(setProvider, v)}
          onStatusChange={(v) => handleFilterChange(setStatusFilter, v)}
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

      {hasNewData && !isLive && (
        <button
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          onClick={() => {
            setHasNewData(false);
            refetch();
          }}
          type="button"
        >
          New requests available — click to refresh
        </button>
      )}

      {displayError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {displayError}
        </div>
      )}

      <RequestTable
        emptyMessage={
          isLive
            ? "Waiting for new requests..."
            : "No requests found for the selected filters."
        }
        loading={loading}
        loadingMessage={
          isLive ? "Connecting to live stream..." : "Loading requests..."
        }
        onPageChange={setPage}
        page={page}
        requests={requests}
        showPagination={!isLive}
        total={total}
      />
    </div>
  );
};

export default RequestsPage;
