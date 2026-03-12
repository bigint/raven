"use client";

import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader } from "@raven/ui";
import { useEventStream } from "@/hooks/use-event-stream";
import { API_URL, getOrgId } from "@/lib/api";
import { RequestFilters } from "./components/request-filters";
import { RequestTable } from "./components/request-table";
import {
  requestsQueryOptions,
  type DateRange,
  type RequestLog
} from "./hooks/use-requests";

const RequestsPage = () => {
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("24h");
  const [isLive, setIsLive] = useState(false);
  const [hasNewData, setHasNewData] = useState(false);

  // Live mode state
  const [liveRequests, setLiveRequests] = useState<RequestLog[]>([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    ...requestsQueryOptions({ page, provider, status: statusFilter, range: dateRange }),
    enabled: !isLive
  });

  const requests = isLive ? liveRequests : (data?.data ?? []);
  const total = isLive ? liveTotal : (data?.pagination.total ?? 0);
  const loading = isLive ? liveLoading : isLoading;
  const displayError = isLive ? liveError : error?.message ?? null;

  useEventStream({
    enabled: !isLive,
    events: ["request.created"],
    onEvent: () => setHasNewData(true)
  });

  useEffect(
    () => setHasNewData(false),
    [page, provider, statusFilter, dateRange]
  );

  // Live SSE mode
  useEffect(() => {
    if (!isLive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    setLiveLoading(true);
    setLiveError(null);

    const orgId = getOrgId();
    const url = `${API_URL}/v1/analytics/requests/live${orgId ? `?orgId=${orgId}` : ""}`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("init", (e) => {
      const logs: RequestLog[] = JSON.parse(e.data);
      setLiveRequests(logs);
      setLiveTotal(logs.length);
      setLiveLoading(false);
    });

    es.addEventListener("new", (e) => {
      const newLogs: RequestLog[] = JSON.parse(e.data);
      setLiveRequests((prev) => {
        const merged = [...newLogs, ...prev];
        const seen = new Set<string>();
        return merged
          .filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          })
          .slice(0, 200);
      });
      setLiveTotal((prev) => prev + newLogs.length);
    });

    es.addEventListener("error", () => {
      setLiveError("Live connection lost. Reconnecting...");
      setLiveLoading(false);
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isLive]);

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
        title="Requests"
        description="View and inspect API request logs."
        actions={
          <Button
            variant={isLive ? "primary" : "secondary"}
            onClick={toggleLive}
            className={isLive ? "bg-green-500/10 text-green-600 border border-green-500/30 hover:opacity-100" : ""}
          >
            <Radio className={`size-4 ${isLive ? "animate-pulse" : ""}`} />
            {isLive ? "Live" : "Go Live"}
          </Button>
        }
      />

      {!isLive && (
        <RequestFilters
          provider={provider}
          onProviderChange={(v) => handleFilterChange(setProvider, v)}
          statusFilter={statusFilter}
          onStatusChange={(v) => handleFilterChange(setStatusFilter, v)}
          dateRange={dateRange}
          onDateRangeChange={(v) => {
            setDateRange(v);
            setPage(1);
          }}
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
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {displayError}
        </div>
      )}

      <RequestTable
        requests={requests}
        loading={loading}
        loadingMessage={isLive ? "Connecting to live stream..." : "Loading requests..."}
        emptyMessage={
          isLive
            ? "Waiting for new requests..."
            : "No requests found for the selected filters."
        }
        total={total}
        page={page}
        onPageChange={setPage}
        showPagination={!isLive}
      />
    </div>
  );
};

export default RequestsPage;
