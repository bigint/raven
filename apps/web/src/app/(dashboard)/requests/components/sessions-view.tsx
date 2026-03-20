"use client";

import { Input, PillTabs, Select, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import {
  type SessionRequest,
  sessionDetailQueryOptions,
  useLogs
} from "../hooks/use-logs";
import { LogsTable } from "./logs-table";
import { RequestDetail } from "./request-detail";

export const SessionsView = () => {
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
            <Input
              onChange={(e) => setCustomRange(e.target.value, customTo)}
              type="date"
              value={customFrom}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              min={customFrom}
              onChange={(e) => setCustomRange(customFrom, e.target.value)}
              type="date"
              value={customTo}
            />
          </div>
        )}

        <Select
          onChange={setModelFilter}
          options={[
            { label: "All Models", value: "" },
            ...uniqueModels.map((model) => ({ label: model, value: model }))
          ]}
          value={modelFilter}
        />
      </div>

      <LogsTable
        data={filteredData}
        loading={isLoading}
        onRequestClick={handleRequestClick}
      />

      <div className="mt-4 flex items-center gap-2">
        <Select
          label="Rows per page"
          onChange={(val) => setPageSize(Number(val))}
          options={[
            { label: "10", value: "10" },
            { label: "25", value: "25" },
            { label: "50", value: "50" },
            { label: "100", value: "100" }
          ]}
          value={String(pageSize)}
        />
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
