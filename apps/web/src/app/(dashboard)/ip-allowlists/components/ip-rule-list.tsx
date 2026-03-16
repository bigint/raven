"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Pencil, Plus, ShieldBan, Trash2 } from "lucide-react";
import { TextMorph } from "torph/react";
import type { IpRule } from "../hooks/use-ip-allowlists";

interface IpRuleListProps {
  rules: IpRule[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (rule: IpRule) => void;
  onDelete: (id: string) => void;
  onToggle: (rule: IpRule) => void;
}

const columns = ({
  onToggle
}: {
  onToggle: (rule: IpRule) => void;
}): Column<IpRule>[] => [
  {
    header: "CIDR",
    key: "cidr",
    render: (rule) => <span className="font-mono text-sm">{rule.cidr}</span>
  },
  {
    header: "Description",
    key: "description",
    render: (rule) => (
      <span className="text-muted-foreground">{rule.description ?? "—"}</span>
    )
  },
  {
    header: "Enabled",
    key: "isEnabled",
    render: (rule) => (
      <button
        className="cursor-pointer"
        onClick={() => onToggle(rule)}
        type="button"
      >
        <Badge variant={rule.isEnabled ? "success" : "neutral"}>
          <TextMorph>{rule.isEnabled ? "Enabled" : "Disabled"}</TextMorph>
        </Badge>
      </button>
    )
  },
  {
    header: "Created",
    key: "createdAt",
    render: (rule) => (
      <span className="text-muted-foreground text-sm">
        {new Date(rule.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

const IpRuleList = ({
  rules,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggle
}: IpRuleListProps) => {
  const allColumns: Column<IpRule>[] = [
    ...columns({ onToggle }),
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
            title="Edit rule"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(rule.id)}
            size="sm"
            title="Delete rule"
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
      data={rules}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first IP rule
        </Button>
      }
      emptyIcon={<ShieldBan className="size-8" />}
      emptyTitle="No IP allowlist rules yet"
      keyExtractor={(r) => r.id}
      loading={loading}
      loadingMessage="Loading IP rules..."
    />
  );
};

export { IpRuleList };
