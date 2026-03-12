"use client";

import { Check, Key, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "@raven/ui";
import type { VirtualKey } from "../hooks/use-keys";

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

interface KeyListProps {
  keys: VirtualKey[];
  onCreate: () => void;
  onDelete: (id: string) => void;
  onEdit: (key: VirtualKey) => void;
}

const KeyList = ({ keys, onCreate, onDelete, onEdit }: KeyListProps) => {
  if (keys.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            Create your first key
          </Button>
        }
        icon={<Key className="size-8" />}
        message="No keys created yet."
      />
    );
  }

  return (
    <DataTable
      columns={[
        {
          header: "Name",
          key: "name",
          render: (key) => (
            <span className="font-medium">{key.name}</span>
          ),
        },
        {
          header: "Environment",
          key: "environment",
          render: (key) => (
            <Badge variant={key.environment === "live" ? "success" : "warning"}>
              {key.environment === "live" ? "Live" : "Test"}
            </Badge>
          ),
        },
        {
          header: "Rate Limits",
          key: "rateLimits",
          render: (key) => {
            if (key.rateLimitRpm === null && key.rateLimitRpd === null) {
              return <span className="text-muted-foreground/50">{"\u2014"}</span>;
            }
            return (
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                {key.rateLimitRpm !== null && (
                  <span>{Number(key.rateLimitRpm).toLocaleString()} / min</span>
                )}
                {key.rateLimitRpd !== null && (
                  <span>{Number(key.rateLimitRpd).toLocaleString()} / day</span>
                )}
              </div>
            );
          },
        },
        {
          header: "Status",
          key: "status",
          render: (key) => (
            <Badge variant={key.isActive ? "success" : "neutral"}>
              {key.isActive ? (
                <>
                  <Check className="size-3" />
                  Active
                </>
              ) : (
                <>
                  <X className="size-3" />
                  Inactive
                </>
              )}
            </Badge>
          ),
        },
        {
          header: "Last Used",
          key: "lastUsed",
          render: (key) => (
            <span className="text-sm text-muted-foreground">
              {formatDate(key.lastUsedAt)}
            </span>
          ),
        },
        {
          align: "right",
          header: "Actions",
          key: "actions",
          render: (key) => (
            <div className="flex items-center justify-end gap-1">
              <button
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => onEdit(key)}
                title="Edit key"
                type="button"
              >
                <Pencil className="size-4" />
              </button>
              <button
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(key.id)}
                title="Delete key"
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ),
        },
      ]}
      data={keys}
      rowKey={(key) => key.id}
    />
  );
};

export { KeyList };
