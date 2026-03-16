"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Check, Pencil, Plug, Plus, Trash2, X } from "lucide-react";
import { TextMorph } from "torph/react";
import type { McpServer } from "../hooks/use-mcp";
import { TRANSPORT_LABELS } from "../hooks/use-mcp";

interface McpListProps {
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (server: McpServer) => void;
  onToggleEnabled: (server: McpServer) => void;
  servers: McpServer[];
}

const STATUS_VARIANTS: Record<string, "error" | "neutral" | "success"> = {
  active: "success",
  error: "error",
  inactive: "neutral"
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  error: "Error",
  inactive: "Inactive"
};

const formatDate = (date: string | null) => {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString();
};

const truncateUrl = (url: string) => {
  if (url.length <= 40) return url;
  return `${url.slice(0, 37)}...`;
};

const columns: Column<McpServer>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (server) => (
      <div>
        <span className="font-medium">{server.name}</span>
        {server.description && (
          <p className="text-xs text-muted-foreground">{server.description}</p>
        )}
      </div>
    )
  },
  {
    className: "text-muted-foreground",
    header: "URL",
    key: "url",
    render: (server) => (
      <span className="font-mono text-xs" title={server.url}>
        {truncateUrl(server.url)}
      </span>
    )
  },
  {
    header: "Transport",
    key: "transport",
    render: (server) => (
      <Badge variant="neutral">
        {TRANSPORT_LABELS[server.transport] ?? server.transport}
      </Badge>
    )
  },
  {
    header: "Status",
    key: "status",
    render: (server) => (
      <Badge dot variant={STATUS_VARIANTS[server.status] ?? "neutral"}>
        {STATUS_LABELS[server.status] ?? server.status}
      </Badge>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Tools",
    key: "toolCount",
    render: (server) => server.toolCount
  },
  {
    className: "text-muted-foreground",
    header: "Last Health Check",
    key: "lastHealthCheck",
    render: (server) => formatDate(server.lastHealthCheck)
  }
];

const McpList = ({
  loading,
  onAdd,
  onDelete,
  onEdit,
  onToggleEnabled,
  servers
}: McpListProps) => {
  const allColumns: Column<McpServer>[] = [
    ...columns,
    {
      header: "Enabled",
      key: "isEnabled",
      render: (server) => (
        <button
          className="cursor-pointer"
          onClick={() => onToggleEnabled(server)}
          type="button"
        >
          <Badge dot variant={server.isEnabled ? "success" : "neutral"}>
            {server.isEnabled ? (
              <>
                <Check className="size-3" />
                <TextMorph>Enabled</TextMorph>
              </>
            ) : (
              <>
                <X className="size-3" />
                <TextMorph>Disabled</TextMorph>
              </>
            )}
          </Badge>
        </button>
      )
    },
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (server) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(server)}
            size="sm"
            title="Edit server"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(server.id)}
            size="sm"
            title="Delete server"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={allColumns}
      data={servers}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first MCP server
        </Button>
      }
      emptyIcon={<Plug className="size-8" />}
      emptyTitle="No MCP servers yet"
      keyExtractor={(s) => s.id}
      loading={loading}
      loadingMessage="Loading MCP servers..."
    />
  );
};

export { McpList };
