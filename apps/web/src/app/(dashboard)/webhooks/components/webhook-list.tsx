"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable, Tooltip } from "@raven/ui";
import { Pencil, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { useMemo } from "react";
import { TextMorph } from "torph/react";
import type { Webhook } from "../hooks/use-webhooks";

interface WebhookListProps {
  readonly webhooks: Webhook[];
  readonly loading: boolean;
  readonly onAdd: () => void;
  readonly onEdit: (webhook: Webhook) => void;
  readonly onDelete: (id: string) => void;
}

const columns: Column<Webhook>[] = [
  {
    header: "URL",
    key: "url",
    render: (webhook) => (
      <Tooltip content={webhook.url}>
        <span className="truncate max-w-[280px] block">
          {webhook.url}
        </span>
      </Tooltip>
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
        <TextMorph>{webhook.isEnabled ? "Enabled" : "Disabled"}</TextMorph>
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
  const allColumns: Column<Webhook>[] = useMemo(
    () => [
      ...columns,
      {
        className: "text-right",
        header: "Actions",
        headerClassName: "text-right",
        key: "actions",
        render: (webhook) => (
          <div className="flex items-center justify-end gap-1">
            <Tooltip content="Edit webhook">
              <Button
                onClick={() => onEdit(webhook)}
                size="sm"
                variant="ghost"
              >
                <Pencil className="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete webhook">
              <Button
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(webhook.id)}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </Tooltip>
          </div>
        )
      }
    ],
    [onEdit, onDelete]
  );

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
      emptyIcon={<WebhookIcon className="size-8" />}
      emptyTitle="No webhooks yet"
      keyExtractor={(w) => w.id}
      loading={loading}
      loadingMessage="Loading webhooks..."
    />
  );
};

export { WebhookList };
