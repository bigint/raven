"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { TextMorph } from "torph/react";
import type { RoutingRule } from "../hooks/use-routing-rules";
import { CONDITION_LABELS } from "../hooks/use-routing-rules";

interface RoutingRuleListProps {
  readonly rules: RoutingRule[];
  readonly loading: boolean;
  readonly onAdd: () => void;
  readonly onEdit: (rule: RoutingRule) => void;
  readonly onDelete: (id: string) => void;
}

const columns: Column<RoutingRule>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (rule) => rule.name
  },
  {
    className: "font-mono text-muted-foreground",
    header: "Source Model",
    key: "sourceModel",
    render: (rule) => rule.sourceModel
  },
  {
    className: "font-mono text-muted-foreground",
    header: "Target Model",
    key: "targetModel",
    render: (rule) => rule.targetModel
  },
  {
    header: "Condition",
    key: "condition",
    render: (rule) => (
      <Badge variant="neutral">
        {CONDITION_LABELS[rule.condition] ?? rule.condition}
      </Badge>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Value",
    key: "conditionValue",
    render: (rule) => rule.conditionValue
  },
  {
    className: "text-muted-foreground",
    header: "Priority",
    key: "priority",
    render: (rule) => rule.priority
  },
  {
    header: "Enabled",
    key: "isEnabled",
    render: (rule) => (
      <Badge variant={rule.isEnabled ? "success" : "neutral"}>
        <TextMorph>{rule.isEnabled ? "Yes" : "No"}</TextMorph>
      </Badge>
    )
  }
];

const RoutingRuleList = ({
  rules,
  loading,
  onAdd,
  onEdit,
  onDelete
}: RoutingRuleListProps) => {
  const allColumns: Column<RoutingRule>[] = useMemo(
    () => [
      ...columns,
      {
        className: "text-right",
        header: "Actions",
        headerClassName: "text-right",
        key: "actions",
        render: (rule) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              onClick={() => onEdit(rule)}
              size="sm"
              title="Edit routing rule"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(rule.id)}
              size="sm"
              title="Delete routing rule"
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
      data={rules}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first routing rule
        </Button>
      }
      emptyIcon={<GitBranch className="size-8" />}
      emptyTitle="No routing rules yet"
      keyExtractor={(r) => r.id}
      loading={loading}
      loadingMessage="Loading routing rules..."
    />
  );
};

export { RoutingRuleList };
