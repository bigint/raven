"use client";

import type { Column } from "@raven/ui";
import { DataTable } from "@raven/ui";
import { ScrollText } from "lucide-react";
import type { AuditLog } from "../hooks/use-admin";
import { useAdminAuditLogs } from "../hooks/use-admin";

export const AuditLogsTab = () => {
  const { data: logs, isPending } = useAdminAuditLogs();

  const columns: Column<AuditLog>[] = [
    {
      header: "Action",
      key: "action",
      render: (log) => <span className="font-medium">{log.action}</span>
    },
    {
      header: "Resource Type",
      key: "resourceType",
      render: (log) => (
        <span className="text-muted-foreground">{log.resourceType}</span>
      )
    },
    {
      header: "Actor",
      key: "actor",
      render: (log) => (
        <span className="text-muted-foreground">{log.actor}</span>
      )
    },
    {
      header: "Timestamp",
      key: "createdAt",
      render: (log) => (
        <span className="text-muted-foreground">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={logs ?? []}
      emptyIcon={<ScrollText className="size-5 text-muted-foreground" />}
      emptyTitle="No audit logs"
      keyExtractor={(log) => log.id}
      loading={isPending}
      loadingMessage="Loading audit logs..."
    />
  );
};
