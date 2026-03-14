"use client";

import type { Column } from "@raven/ui";
import { DataTable } from "@raven/ui";
import { ScrollText } from "lucide-react";
import type { AdminAuditLog } from "../../hooks/use-admin";
import { useAdminAuditLogs } from "../../hooks/use-admin";

const columns: Column<AdminAuditLog>[] = [
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
    render: (l) => (
      <span className="text-muted-foreground">{l.resourceType}</span>
    )
  },
  {
    header: "Actor",
    key: "actor",
    render: (l) => (
      <div>
        <p className="text-sm font-medium">{l.actorName}</p>
        <p className="text-xs text-muted-foreground">{l.actorEmail}</p>
      </div>
    )
  },
  {
    header: "Organization",
    key: "orgName",
    render: (l) => <span className="text-muted-foreground">{l.orgName}</span>
  },
  {
    header: "Time",
    key: "createdAt",
    render: (l) => (
      <span className="text-muted-foreground">
        {new Date(l.createdAt).toLocaleString()}
      </span>
    )
  }
];

const AdminAuditLogsPage = () => {
  const { data: logs = [], isPending } = useAdminAuditLogs();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide activity log (latest 200).
        </p>
      </div>
      <DataTable
        columns={columns}
        data={logs}
        emptyIcon={<ScrollText className="size-8 text-muted-foreground" />}
        emptyTitle="No audit logs"
        keyExtractor={(l) => l.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminAuditLogsPage;
