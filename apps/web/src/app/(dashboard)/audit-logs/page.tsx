"use client";

import type { Column } from "@raven/ui";
import { Badge, DataTable, PageHeader, Tooltip } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import {
  Key,
  Network,
  Pencil,
  Plus,
  Route,
  ScrollText,
  Shield,
  Trash2,
  Wallet,
  Webhook
} from "lucide-react";
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

const ACTION_VERBS: Record<
  string,
  { label: string; variant: "success" | "info" | "error" }
> = {
  created: { label: "Created", variant: "success" },
  deleted: { label: "Deleted", variant: "error" },
  updated: { label: "Updated", variant: "info" }
};

const RESOURCE_ICONS: Record<string, typeof Key> = {
  budget: Wallet,
  guardrail: Shield,
  key: Key,
  provider: Network,
  "routing-rule": Route,
  webhook: Webhook
};

const RESOURCE_LABELS: Record<string, string> = {
  budget: "Budget",
  guardrail: "Guardrail",
  key: "API Key",
  provider: "Provider",
  "routing-rule": "Routing Rule",
  webhook: "Webhook"
};

const parseAction = (action: string) => {
  const dotIndex = action.lastIndexOf(".");
  if (dotIndex === -1) return { resource: action, verb: action };
  return {
    resource: action.slice(0, dotIndex),
    verb: action.slice(dotIndex + 1)
  };
};

const ActionBadge = ({ action }: { action: string }) => {
  const { verb } = parseAction(action);
  const meta = ACTION_VERBS[verb];
  if (!meta) return <Badge variant="neutral">{action}</Badge>;

  const Icon = verb === "created" ? Plus : verb === "deleted" ? Trash2 : Pencil;

  return (
    <Badge variant={meta.variant}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
};

const ResourceCell = ({ resourceType }: { resourceType: string }) => {
  const Icon = RESOURCE_ICONS[resourceType] ?? ScrollText;
  const label = RESOURCE_LABELS[resourceType] ?? resourceType;

  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
};

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

const columns: Column<AuditLog>[] = [
  {
    header: "Resource",
    key: "resourceType",
    render: (log) => <ResourceCell resourceType={log.resourceType} />
  },
  {
    header: "Action",
    key: "action",
    render: (log) => <ActionBadge action={log.action} />
  },
  {
    header: "Actor",
    key: "actor",
    render: (log) => {
      const name = log.actorName || "System";

      return (
        <div className="flex flex-col">
          <span className="text-sm">{name}</span>
          {log.actorEmail && name !== log.actorEmail && (
            <span className="text-xs text-muted-foreground">
              {log.actorEmail}
            </span>
          )}
        </div>
      );
    }
  },
  {
    className: "text-right",
    header: "Time",
    headerClassName: "text-right",
    key: "createdAt",
    render: (log) => (
      <Tooltip content={new Date(log.createdAt).toLocaleString()}>
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatRelativeTime(log.createdAt)}
        </span>
      </Tooltip>
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
