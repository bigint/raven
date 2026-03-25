"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable, EmptyState, Tooltip } from "@raven/ui";
import { BarChart3, Check, Key, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { TextMorph } from "torph/react";
import { formatDate } from "@/lib/format";
import type { VirtualKey } from "../hooks/use-keys";

interface KeyListProps {
  readonly keys: VirtualKey[];
  readonly loading?: boolean;
  readonly onCreate: () => void;
  readonly onDelete: (id: string) => void;
  readonly onEdit: (key: VirtualKey) => void;
}

const KeyList = ({
  keys,
  loading,
  onCreate,
  onDelete,
  onEdit
}: KeyListProps) => {
  const allColumns = useMemo(
    () =>
      [
        {
          header: "Name",
          key: "name",
          render: (key) => <span className="font-medium">{key.name}</span>
        },
        {
          header: "Environment",
          key: "environment",
          render: (key) => (
            <Badge variant={key.environment === "live" ? "success" : "warning"}>
              {key.environment === "live" ? "Live" : "Test"}
            </Badge>
          )
        },
        {
          header: "Rate Limits",
          key: "rateLimits",
          render: (key) => {
            if (key.rateLimitRpm === null && key.rateLimitRpd === null) {
              return (
                <span className="text-muted-foreground/50">{"\u2014"}</span>
              );
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
          }
        },
        {
          header: "Expires",
          key: "expiresAt",
          render: (key) => {
            if (!key.expiresAt) {
              return (
                <span className="text-muted-foreground/50">{"\u2014"}</span>
              );
            }
            const isExpired = new Date(key.expiresAt) < new Date();
            return (
              <span
                className={
                  isExpired
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {isExpired ? "Expired " : ""}
                {formatDate(key.expiresAt)}
              </span>
            );
          }
        },
        {
          header: "Status",
          key: "status",
          render: (key) => (
            <Badge variant={key.isActive ? "success" : "neutral"}>
              {key.isActive ? (
                <>
                  <Check aria-hidden="true" className="size-3" />
                  <TextMorph>Active</TextMorph>
                </>
              ) : (
                <>
                  <X aria-hidden="true" className="size-3" />
                  <TextMorph>Inactive</TextMorph>
                </>
              )}
            </Badge>
          )
        },
        {
          header: "Last Used",
          key: "lastUsed",
          render: (key) => (
            <span className="text-sm text-muted-foreground">
              {formatDate(key.lastUsedAt)}
            </span>
          )
        },
        {
          header: "Actions",
          key: "actions",
          render: (key) => (
            <div className="flex items-center justify-end gap-1">
              <Link href={`/analytics?keyId=${key.id}`}>
                <Tooltip content="View analytics">
                  <Button
                    aria-label="View analytics"
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <BarChart3 className="size-4" />
                  </Button>
                </Tooltip>
              </Link>
              <Tooltip content="Edit key">
                <Button
                  aria-label="Edit key"
                  onClick={() => onEdit(key)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="size-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Delete key">
                <Button
                  aria-label="Delete key"
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(key.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </Tooltip>
            </div>
          )
        }
      ] satisfies Column<VirtualKey>[],
    [onEdit, onDelete]
  );

  if (!loading && keys.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            Create your first key
          </Button>
        }
        icon={<Key className="size-8" />}
        title="No keys yet"
      />
    );
  }

  return (
    <DataTable
      columns={allColumns}
      data={keys}
      keyExtractor={(key) => key.id}
      loading={loading}
      loadingMessage="Loading keys..."
    />
  );
};

export { KeyList };
