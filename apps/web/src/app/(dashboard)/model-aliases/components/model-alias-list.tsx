"use client";

import type { Column } from "@raven/ui";
import { Button, DataTable } from "@raven/ui";
import { Plus, Replace, Trash2 } from "lucide-react";
import type { ModelAlias } from "../hooks/use-model-aliases";

interface ModelAliasListProps {
  aliases: ModelAlias[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const columns: Column<ModelAlias>[] = [
  {
    className: "font-medium font-mono",
    header: "Alias",
    key: "alias",
    render: (alias) => alias.alias
  },
  {
    className: "font-mono text-muted-foreground",
    header: "Target Model",
    key: "targetModel",
    render: (alias) => alias.targetModel
  },
  {
    className: "text-muted-foreground",
    header: "Created",
    key: "createdAt",
    render: (alias) =>
      new Date(alias.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
  }
];

const ModelAliasList = ({
  aliases,
  loading,
  onAdd,
  onDelete
}: ModelAliasListProps) => {
  const allColumns: Column<ModelAlias>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (alias) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(alias.id)}
            size="sm"
            title="Delete alias"
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
      data={aliases}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Create your first alias
        </Button>
      }
      emptyIcon={<Replace className="size-8" />}
      emptyTitle="No model aliases yet"
      keyExtractor={(a) => a.id}
      loading={loading}
      loadingMessage="Loading model aliases..."
    />
  );
};

export { ModelAliasList };
