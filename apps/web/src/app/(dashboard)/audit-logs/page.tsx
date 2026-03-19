"use client";

import type { Column } from "@raven/ui";
import { DataTable, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api";

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

const columns: Column<AuditLog>[] = [
  {
    header: "Action",
    key: "action",
    render: (l) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.action}</code>
    )
  },
  {
    header: "Resource",
    key: "resource",
    render: (l) => <span className="text-foreground/70">{l.resourceType}</span>
  },
  {
    header: "Actor",
    key: "actor",
    render: (l) => (
      <div>
        <p className="text-sm font-medium">{l.actorName ?? "System"}</p>
        <p className="text-xs text-muted-foreground">{l.actorEmail}</p>
      </div>
    )
  },
  {
    header: "Time",
    key: "createdAt",
    render: (l) => (
      <span className="text-foreground/70">
        {new Date(l.createdAt).toLocaleString()}
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
    queryKey: ["audit-logs"],
    staleTime: 30_000
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
        emptyIcon={<ScrollText className="size-8 text-muted-foreground" />}
        emptyTitle="No audit logs yet"
        keyExtractor={(l) => l.id}
        loading={isPending}
      />
    </div>
  );
};

export default AuditLogsPage;
