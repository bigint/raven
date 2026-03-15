"use client";

import type { Column } from "@raven/ui";
import { Badge, DataTable } from "@raven/ui";
import { Activity } from "lucide-react";
import { ModelIcon } from "@/components/model-icon";
import { formatDateTime } from "@/lib/format";
import type { RequestLog } from "../hooks/use-requests";
import { PROVIDER_LABELS } from "../hooks/use-requests";

interface RequestTableProps {
  requests: RequestLog[];
  loading: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  animateRows?: boolean;
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

const columns: Column<RequestLog>[] = [
  {
    className: "text-xs text-muted-foreground whitespace-nowrap",
    header: "Time",
    key: "time",
    render: (req) => formatDateTime(req.createdAt)
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
    render: (req) => (
      <span className="inline-flex items-center gap-1.5">
        <ModelIcon model={req.model} provider={req.provider} size={14} />
        {req.model}
      </span>
    )
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
  animateRows = false
}: RequestTableProps) => {
  return (
    <DataTable
      animateRows={animateRows}
      columns={columns}
      data={requests}
      emptyIcon={<Activity className="size-8" />}
      emptyTitle={emptyMessage}
      keyExtractor={(r) => r.id}
      loading={loading}
      loadingMessage={loadingMessage}
    />
  );
};

export { RequestTable };
