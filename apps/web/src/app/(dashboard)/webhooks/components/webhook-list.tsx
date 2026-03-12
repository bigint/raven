"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Webhook } from "../hooks/use-webhooks";

interface WebhookListProps {
  webhooks: Webhook[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => void;
}

const columns: Column<Webhook>[] = [
  {
    header: "URL",
    key: "url",
    render: (webhook) => (
      <span className="truncate max-w-[280px] block" title={webhook.url}>
        {webhook.url}
      </span>
    )
  },
  {
    header: "Events",
    key: "events",
    render: (webhook) => (
      <Badge variant="neutral">
        {webhook.events.length}{" "}
        {webhook.events.length === 1 ? "event" : "events"}
      </Badge>
    )
  },
  {
    className: "font-mono text-muted-foreground",
    header: "Secret",
    key: "secret",
    render: (webhook) =>
      webhook.secret ? `${"*".repeat(8)}${webhook.secret.slice(-4)}` : "—"
  },
  {
    header: "Enabled",
    key: "isEnabled",
    render: (webhook) => (
      <Badge variant={webhook.isEnabled ? "success" : "neutral"}>
        {webhook.isEnabled ? "Enabled" : "Disabled"}
      </Badge>
    )
  }
];

const WebhookList = ({
  webhooks,
  loading,
  onAdd,
  onEdit,
  onDelete
}: WebhookListProps) => {
  const allColumns: Column<Webhook>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (webhook) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(webhook)}
            size="sm"
            title="Edit webhook"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(webhook.id)}
            size="sm"
            title="Delete webhook"
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
      data={webhooks}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first webhook
        </Button>
      }
      emptyTitle="No webhooks configured yet."
      keyExtractor={(w) => w.id}
      loading={loading}
      loadingMessage="Loading webhooks..."
    />
  );
};

export { WebhookList };
