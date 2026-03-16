"use client";

import { PROVIDER_LABELS } from "@raven/types";
import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Check, Pencil, Plug, Plus, Trash2, X } from "lucide-react";
import { TextMorph } from "torph/react";
import { ProviderIcon } from "@/components/model-icon";
import type { Provider } from "../hooks/use-providers";

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
    header: "Provider",
    key: "provider",
    render: (provider) => (
      <div>
        <span className="flex items-center gap-2 font-medium">
          <ProviderIcon provider={provider.provider} size={16} />
          {PROVIDER_LABELS[provider.provider] ?? provider.provider}
        </span>
        {provider.name && (
          <p className="text-xs text-muted-foreground">{provider.name}</p>
        )}
      </div>
    )
  },
  {
    header: "API Key",
    key: "apiKey",
    render: (provider) => {
      const key = provider.apiKey;
      if (!key || key.length < 4) return "••••••••";
      const last4 = key.slice(-4);
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {`••••••••${last4}`}
        </span>
      );
    }
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
      header: "Status",
      key: "status",
      render: (provider) => (
        <button
          className="cursor-pointer"
          onClick={() => onToggleEnabled(provider)}
          type="button"
        >
          <Badge dot variant={provider.isEnabled ? "success" : "neutral"}>
            {provider.isEnabled ? (
              <>
                <Check className="size-3" />
                <TextMorph>Enabled</TextMorph>
              </>
            ) : (
              <>
                <X className="size-3" />
                <TextMorph>Disabled</TextMorph>
              </>
            )}
          </Badge>
        </button>
      )
    },
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (provider) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(provider)}
            size="sm"
            title="Edit provider"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(provider.id)}
            size="sm"
            title="Delete provider"
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
      data={providers}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first provider
        </Button>
      }
      emptyIcon={<Plug className="size-8" />}
      emptyTitle="No providers yet"
      keyExtractor={(p) => p.id}
      loading={loading}
      loadingMessage="Loading providers..."
    />
  );
};

export { ProviderList };
