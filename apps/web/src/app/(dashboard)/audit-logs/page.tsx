"use client";

import type { Column } from "@raven/ui";
import { DataTable, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatTimeAgo } from "@/lib/format";

interface AuditLog {
  readonly id: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
  readonly actorName: string | null;
  readonly actorEmail: string | null;
}

const formatAction = (action: string): string =>
  action.replace(/\./g, " ").replace(/^./, (c) => c.toUpperCase());

const columns: Column<AuditLog>[] = [
  {
    header: "Action",
    key: "action",
    render: (log) => (
      <span className="text-sm font-medium">{formatAction(log.action)}</span>
    )
  },
  {
    header: "Resource",
    key: "resourceType",
    render: (log) => (
      <div>
        <span className="text-sm capitalize">{log.resourceType}</span>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {log.resourceId}
        </p>
      </div>
    )
  },
  {
    header: "Actor",
    key: "actorName",
    render: (log) => (
      <div>
        <span className="text-sm">{log.actorName ?? "System"}</span>
        {log.actorEmail && (
          <p className="text-xs text-muted-foreground">{log.actorEmail}</p>
        )}
      </div>
    )
  },
  {
    header: "Time",
    key: "createdAt",
    render: (log) => (
      <span className="text-xs text-muted-foreground">
        {formatTimeAgo(log.createdAt)}
      </span>
    )
  }
];

const AuditLogsPage = () => {
  const {
    data: logs = [],
    isPending,
    isError,
    error
  } = useQuery({
    queryFn: () => api.get<AuditLog[]>("/v1/audit-logs"),
    queryKey: ["audit-logs"]
  });

  return (
    <div>
      <PageHeader
        description="Track all changes made within your organization."
        title="Audit Logs"
      />
      {isError && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}
      <DataTable
        columns={columns}
        data={logs}
        emptyTitle="No audit logs yet"
        keyExtractor={(l) => l.id}
        loading={isPending}
        loadingMessage="Loading audit logs..."
      />
    </div>
  );
};

export default AuditLogsPage;
