"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { TextMorph } from "torph/react";
import type { Guardrail } from "../hooks/use-guardrails";
import { ACTION_LABELS, TYPE_LABELS } from "../hooks/use-guardrails";

interface GuardrailListProps {
  readonly guardrails: Guardrail[];
  readonly loading: boolean;
  readonly onAdd: () => void;
  readonly onEdit: (guardrail: Guardrail) => void;
  readonly onDelete: (id: string) => void;
}

const ACTION_VARIANTS: Record<string, "error" | "warning" | "neutral"> = {
  block: "error",
  log: "neutral",
  warn: "warning"
};

const columns: Column<Guardrail>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (guardrail) => guardrail.name
  },
  {
    header: "Type",
    key: "type",
    render: (guardrail) => (
      <Badge variant="neutral">
        {TYPE_LABELS[guardrail.type] ?? guardrail.type}
      </Badge>
    )
  },
  {
    header: "Action",
    key: "action",
    render: (guardrail) => (
      <Badge variant={ACTION_VARIANTS[guardrail.action] ?? "neutral"}>
        {ACTION_LABELS[guardrail.action] ?? guardrail.action}
      </Badge>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Priority",
    key: "priority",
    render: (guardrail) => guardrail.priority
  },
  {
    header: "Enabled",
    key: "isEnabled",
    render: (guardrail) => (
      <Badge variant={guardrail.isEnabled ? "success" : "neutral"}>
        <TextMorph>{guardrail.isEnabled ? "On" : "Off"}</TextMorph>
      </Badge>
    )
  }
];

const GuardrailList = ({
  guardrails,
  loading,
  onAdd,
  onEdit,
  onDelete
}: GuardrailListProps) => {
  const allColumns: Column<Guardrail>[] = useMemo(
    () => [
      ...columns,
      {
        className: "text-right",
        header: "Actions",
        headerClassName: "text-right",
        key: "actions",
        render: (guardrail) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              onClick={() => onEdit(guardrail)}
              size="sm"
              title="Edit guardrail"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(guardrail.id)}
              size="sm"
              title="Delete guardrail"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      }
    ],
    [onEdit, onDelete]
  );

  return (
    <DataTable
      columns={allColumns}
      data={guardrails}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first guardrail
        </Button>
      }
      emptyIcon={<Shield className="size-8" />}
      emptyTitle="No guardrails yet"
      keyExtractor={(g) => g.id}
      loading={loading}
      loadingMessage="Loading guardrails..."
    />
  );
};

export { GuardrailList };
