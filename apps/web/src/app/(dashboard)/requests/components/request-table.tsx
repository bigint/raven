"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import type { RequestLog } from "../hooks/use-requests";
import { PAGE_SIZE, PROVIDER_LABELS } from "../hooks/use-requests";

interface RequestTableProps {
  requests: RequestLog[];
  loading: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  showPagination: boolean;
}

const getStatusBadge = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) {
    return <Badge variant="success">{statusCode}</Badge>;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return <Badge variant="warning">{statusCode}</Badge>;
  }
  if (statusCode >= 500) {
    return <Badge variant="error">{statusCode}</Badge>;
  }
  return <Badge variant="neutral">{statusCode}</Badge>;
};

const formatTime = (ts: string): string => {
  if (!ts) return "\u2014";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit"
  });
};

const columns: Column<RequestLog>[] = [
  {
    key: "time",
    header: "Time",
    className: "text-xs text-muted-foreground whitespace-nowrap",
    render: (req) => formatTime(req.createdAt)
  },
  {
    key: "provider",
    header: "Provider",
    className: "font-medium",
    render: (req) => PROVIDER_LABELS[req.provider] ?? req.provider
  },
  {
    key: "model",
    header: "Model",
    className: "font-mono text-xs text-muted-foreground",
    render: (req) => req.model
  },
  {
    key: "status",
    header: "Status",
    render: (req) => getStatusBadge(req.statusCode)
  },
  {
    key: "latency",
    header: "Latency",
    headerClassName: "text-right",
    className: "text-right",
    render: (req) => `${req.latencyMs}ms`
  },
  {
    key: "cost",
    header: "Cost",
    headerClassName: "text-right",
    className: "text-right",
    render: (req) => `$${Number(req.cost).toFixed(6)}`
  },
  {
    key: "cache",
    header: "Cache",
    headerClassName: "text-center",
    className: "text-center",
    render: (req) =>
      req.cacheHit ? (
        <Badge variant="success">Hit</Badge>
      ) : (
        <Badge variant="neutral">Miss</Badge>
      )
  }
];

const RequestTable = ({
  requests,
  loading,
  loadingMessage = "Loading requests...",
  emptyMessage = "No requests found for the selected filters.",
  total,
  page,
  onPageChange,
  showPagination
}: RequestTableProps) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <DataTable
        columns={columns}
        data={requests}
        keyExtractor={(r) => r.id}
        loading={loading}
        loadingMessage={loadingMessage}
        emptyTitle={emptyMessage}
      />

      {showPagination && requests.length > 0 && !loading && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export { RequestTable };
