"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
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
  const variant =
    statusCode >= 500
      ? "error"
      : statusCode >= 400
        ? "warning"
        : statusCode >= 200 && statusCode < 300
          ? "success"
          : "neutral";
  return <Badge variant={variant}>{statusCode}</Badge>;
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
    className: "text-xs text-muted-foreground whitespace-nowrap",
    header: "Time",
    key: "time",
    render: (req) => formatTime(req.createdAt)
  },
  {
    className: "font-medium",
    header: "Provider",
    key: "provider",
    render: (req) =>
      req.providerConfigName ? (
        <div>
          <div>{req.providerConfigName}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {PROVIDER_LABELS[req.provider] ?? req.provider}
          </div>
        </div>
      ) : (
        (PROVIDER_LABELS[req.provider] ?? req.provider)
      )
  },
  {
    className: "font-mono text-xs text-muted-foreground",
    header: "Model",
    key: "model",
    render: (req) => req.model
  },
  {
    header: "Status",
    key: "status",
    render: (req) => getStatusBadge(req.statusCode)
  },
  {
    className: "text-right",
    header: "Latency",
    headerClassName: "text-right",
    key: "latency",
    render: (req) => `${req.latencyMs}ms`
  },
  {
    className: "text-right",
    header: "Cost",
    headerClassName: "text-right",
    key: "cost",
    render: (req) => `$${Number(req.cost).toFixed(6)}`
  },
  {
    className: "text-center",
    header: "Cache",
    headerClassName: "text-center",
    key: "cache",
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
  emptyMessage = "No requests yet",
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
        emptyIcon={<Activity className="size-8" />}
        emptyTitle={emptyMessage}
        keyExtractor={(r) => r.id}
        loading={loading}
        loadingMessage={loadingMessage}
      />

      {showPagination && requests.length > 0 && !loading && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              size="sm"
              variant="secondary"
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
