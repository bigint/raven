"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Meter } from "@base-ui/react/meter";
import { DollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import type { Budget } from "../hooks/use-budgets";
import { ENTITY_TYPE_LABELS } from "../hooks/use-budgets";

interface BudgetListProps {
  readonly budgets: Budget[];
  readonly loading: boolean;
  readonly onAdd: () => void;
  readonly onEdit: (budget: Budget) => void;
  readonly onDelete: (id: string) => void;
}

const columns: Column<Budget>[] = [
  {
    header: "Entity Type",
    key: "entityType",
    render: (budget) => (
      <Badge variant="neutral">
        {ENTITY_TYPE_LABELS[budget.entityType] ?? budget.entityType}
      </Badge>
    )
  },
  {
    header: "Name",
    key: "entityName",
    render: (budget) => budget.entityName ?? budget.entityId
  },
  {
    className: "font-medium",
    header: "Limit",
    key: "limitAmount",
    render: (budget) => `$${(Number(budget.limitAmount) || 0).toFixed(2)}`
  },
  {
    className: "capitalize text-muted-foreground",
    header: "Period",
    key: "period",
    render: (budget) => budget.period
  },
  {
    header: "Alert Threshold",
    key: "alertThreshold",
    render: (budget) => (
      <Meter.Root
        className="flex items-center gap-2"
        max={100}
        min={0}
        value={Math.round(Number(budget.alertThreshold) * 100)}
      >
        <Meter.Track className="h-1.5 w-20 rounded-full bg-muted">
          <Meter.Indicator className="h-1.5 rounded-full bg-primary" />
        </Meter.Track>
        <Meter.Value className="text-sm text-muted-foreground">
          {(formattedValue) => `${formattedValue}%`}
        </Meter.Value>
      </Meter.Root>
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
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (budget) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(budget)}
            size="sm"
            title="Edit budget"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(budget.id)}
            size="sm"
            title="Delete budget"
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
      data={budgets}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first budget
        </Button>
      }
      emptyIcon={<DollarSign className="size-8" />}
      emptyTitle="No budgets yet"
      keyExtractor={(b) => b.id}
      loading={loading}
      loadingMessage="Loading budgets..."
    />
  );
};

export { BudgetList };
