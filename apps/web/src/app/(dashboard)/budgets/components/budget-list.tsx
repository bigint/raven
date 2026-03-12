"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import type { Budget } from "../hooks/use-budgets";
import { ENTITY_TYPE_LABELS } from "../hooks/use-budgets";

interface BudgetListProps {
  budgets: Budget[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

const columns: Column<Budget>[] = [
  {
    key: "entityType",
    header: "Entity Type",
    render: (budget) => (
      <Badge variant="neutral">
        {ENTITY_TYPE_LABELS[budget.entityType] ?? budget.entityType}
      </Badge>
    )
  },
  {
    key: "entityId",
    header: "Entity ID",
    className: "font-mono text-muted-foreground",
    render: (budget) => budget.entityId
  },
  {
    key: "limitAmount",
    header: "Limit",
    className: "font-medium",
    render: (budget) => `$${Number(budget.limitAmount).toFixed(2)}`
  },
  {
    key: "period",
    header: "Period",
    className: "capitalize text-muted-foreground",
    render: (budget) => budget.period
  },
  {
    key: "alertThreshold",
    header: "Alert Threshold",
    render: (budget) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary"
            style={{ width: `${Number(budget.alertThreshold) * 100}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {Math.round(Number(budget.alertThreshold) * 100)}%
        </span>
      </div>
    )
  }
];

const BudgetList = ({
  budgets,
  loading,
  onAdd,
  onEdit,
  onDelete
}: BudgetListProps) => {
  const allColumns: Column<Budget>[] = [
    ...columns,
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (budget) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(budget)}
            title="Edit budget"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(budget.id)}
            title="Delete budget"
            className="hover:bg-destructive/10 hover:text-destructive"
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
      data={budgets}
      keyExtractor={(b) => b.id}
      loading={loading}
      loadingMessage="Loading budgets..."
      emptyTitle="No budgets configured yet."
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first budget
        </Button>
      }
    />
  );
};

export { BudgetList };
