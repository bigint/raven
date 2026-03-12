"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import type { Column } from "@raven/ui";
import { Badge, DataTable, Button } from "@raven/ui";
import { Plus } from "lucide-react";
import type { Provider } from "../hooks/use-providers";
import { PROVIDER_LABELS } from "../hooks/use-providers";

interface ProviderListProps {
  providers: Provider[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (provider: Provider) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (provider: Provider) => void;
}

const columns: Column<Provider>[] = [
  {
    key: "provider",
    header: "Provider",
    render: (provider) => (
      <div>
        <span className="font-medium">
          {PROVIDER_LABELS[provider.provider] ?? provider.provider}
        </span>
        {provider.name && (
          <p className="text-xs text-muted-foreground">{provider.name}</p>
        )}
      </div>
    )
  },
  {
    key: "apiKey",
    header: "API Key",
    className: "font-mono text-muted-foreground",
    render: (provider) => provider.apiKey
  }
];

const ProviderList = ({
  providers,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggleEnabled
}: ProviderListProps) => {
  const allColumns: Column<Provider>[] = [
    ...columns,
    {
      key: "status",
      header: "Status",
      render: (provider) => (
        <button
          className="cursor-pointer"
          onClick={() => onToggleEnabled(provider)}
          type="button"
        >
          <Badge
            variant={provider.isEnabled ? "success" : "neutral"}
            dot
          >
            {provider.isEnabled ? (
              <>
                <Check className="size-3" />
                Enabled
              </>
            ) : (
              <>
                <X className="size-3" />
                Disabled
              </>
            )}
          </Badge>
        </button>
      )
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (provider) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(provider)}
            title="Edit provider"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(provider.id)}
            title="Delete provider"
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
      data={providers}
      keyExtractor={(p) => p.id}
      loading={loading}
      loadingMessage="Loading providers..."
      emptyTitle="No providers configured yet."
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first provider
        </Button>
      }
    />
  );
};

export { ProviderList };
