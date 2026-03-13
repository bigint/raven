"use client";

import { PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LogsFilters } from "./components/logs-filters";
import { LogsTable } from "./components/logs-table";
import { RequestDetail } from "./components/request-detail";
import {
  type SessionRequest,
  sessionDetailQueryOptions,
  useLogs
} from "./hooks/use-logs";

const LogsPage = () => {
  const {
    data,
    dateRange,
    dateRangeOptions,
    error,
    isLoading,
    page,
    pagination,
    setDateRange,
    setPage
  } = useLogs();

  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(
    null
  );
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const { data: sessionDetail } = useQuery({
    ...sessionDetailQueryOptions(activeSessionId),
    enabled: !!activeSessionId
  });

  const handleRequestClick = (requestId: string, sessionId: string) => {
    setActiveSessionId(sessionId);
    const requests = sessionDetail?.data ?? [];
    const req = requests.find((r) => r.id === requestId);
    if (req) {
      setSelectedRequest(req);
    }
  };

  return (
    <div>
      <PageHeader
        description="View and monitor LLM request sessions. Expand a session to see individual requests."
        title="Logs"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <LogsFilters
        dateRange={dateRange}
        dateRangeOptions={dateRangeOptions}
        onDateRangeChange={setDateRange}
      />

      <LogsTable
        data={data}
        loading={isLoading}
        onPageChange={setPage}
        onRequestClick={handleRequestClick}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
      />

      <RequestDetail
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />
    </div>
  );
};

export default LogsPage;
