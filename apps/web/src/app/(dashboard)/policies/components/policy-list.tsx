"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { TextMorph } from "torph/react";
import type { Policy } from "../hooks/use-policies";
import {
  COMPLIANCE_FRAMEWORKS,
  SCOPE_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS
} from "../hooks/use-policies";

interface PolicyListProps {
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (policy: Policy) => void;
  policies: Policy[];
}

const columns: Column<Policy>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (policy) => policy.name
  },
  {
    header: "Status",
    key: "status",
    render: (policy) => (
      <Badge variant={STATUS_VARIANTS[policy.status] ?? "neutral"}>
        {STATUS_LABELS[policy.status] ?? policy.status}
      </Badge>
    )
  },
  {
    header: "Scope",
    key: "scope",
    render: (policy) => SCOPE_LABELS[policy.scope] ?? policy.scope
  },
  {
    header: "Rules",
    key: "rules",
    render: (policy) => policy.rules.length
  },
  {
    header: "Frameworks",
    key: "frameworks",
    render: (policy) => (
      <div className="flex flex-wrap gap-1">
        {policy.complianceFrameworks.map((fw) => (
          <Badge key={fw} variant="neutral">
            {COMPLIANCE_FRAMEWORKS.find((f) => f.id === fw)?.label ?? fw}
          </Badge>
        ))}
      </div>
    )
  },
  {
    header: "Enabled",
    key: "isEnabled",
    render: (policy) => (
      <Badge variant={policy.isEnabled ? "success" : "neutral"}>
        <TextMorph>{policy.isEnabled ? "On" : "Off"}</TextMorph>
      </Badge>
    )
  }
];

const PolicyList = ({
  loading,
  onAdd,
  onDelete,
  onEdit,
  policies
}: PolicyListProps) => {
  const allColumns: Column<Policy>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (policy) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(policy)}
            size="sm"
            title="Edit policy"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(policy.id)}
            size="sm"
            title="Delete policy"
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
      data={policies}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first policy
        </Button>
      }
      emptyIcon={<ShieldCheck className="size-8" />}
      emptyTitle="No policies yet"
      keyExtractor={(p) => p.id}
      loading={loading}
      loadingMessage="Loading policies..."
    />
  );
};

export { PolicyList };
