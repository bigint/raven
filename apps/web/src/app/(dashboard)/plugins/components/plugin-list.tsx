"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable, Switch } from "@raven/ui";
import { Check, Pencil, Plus, Puzzle, Trash2 } from "lucide-react";
import type { Plugin } from "../hooks/use-plugins";

interface PluginListProps {
  plugins: Plugin[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (plugin: Plugin) => void;
  onDelete: (id: string) => void;
  onToggle: (plugin: Plugin) => void;
}

const columns: Column<Plugin>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (p) => p.name
  },
  {
    header: "Version",
    key: "version",
    render: (p) => <Badge variant="neutral">{p.version}</Badge>
  },
  {
    header: "Hooks",
    key: "hooks",
    render: (p) => (
      <div className="flex flex-wrap gap-1">
        {p.hooks.map((hook) => (
          <Badge key={hook} variant="info">
            {hook}
          </Badge>
        ))}
      </div>
    )
  },
  {
    header: "Official",
    key: "isOfficial",
    render: (p) =>
      p.isOfficial ? (
        <Badge variant="success">
          <Check className="size-3" />
          Official
        </Badge>
      ) : (
        <span className="text-muted-foreground">&mdash;</span>
      )
  }
];

const PluginList = ({
  plugins,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggle
}: PluginListProps) => {
  const allColumns: Column<Plugin>[] = [
    ...columns,
    {
      header: "Enabled",
      key: "isEnabled",
      render: (p) => (
        <Switch checked={p.isEnabled} onCheckedChange={() => onToggle(p)} />
      )
    },
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(p)}
            size="sm"
            title="Edit plugin"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(p.id)}
            size="sm"
            title="Delete plugin"
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
      data={plugins}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first plugin
        </Button>
      }
      emptyIcon={<Puzzle className="size-8" />}
      emptyTitle="No plugins yet"
      keyExtractor={(p) => p.id}
      loading={loading}
      loadingMessage="Loading plugins..."
    />
  );
};

export { PluginList };
