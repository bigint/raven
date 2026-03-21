"use client";

import { PROVIDER_LABELS } from "@raven/types";
import type { Column } from "@raven/ui";
import { Badge, Button, DataTable, Tooltip } from "@raven/ui";
import {
  Check,
  Loader2,
  Pencil,
  Plug,
  Plus,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import { ProviderIcon } from "@/components/model-icon";
import type { Provider } from "../hooks/use-providers";
import { useTestProvider } from "../hooks/use-providers";

interface ProviderListProps {
  readonly providers: Provider[];
  readonly loading: boolean;
  readonly onAdd: () => void;
  readonly onEdit: (provider: Provider) => void;
  readonly onDelete: (id: string) => void;
  readonly onToggleEnabled: (provider: Provider) => void;
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
  const testMutation = useTestProvider();
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = useCallback(
    async (id: string) => {
      setTestingId(id);
      try {
        const result = await testMutation.mutateAsync(id);
        if (result.success) {
          toast.success("Connected");
        } else {
          toast.error(result.message);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Connection test failed"
        );
      } finally {
        setTestingId(null);
      }
    },
    [testMutation]
  );

  const allColumns: Column<Provider>[] = useMemo(
    () => [
      ...columns,
      {
        header: "Status",
        key: "status",
        render: (provider) => (
          <Button
            className="cursor-pointer p-0"
            onClick={() => onToggleEnabled(provider)}
            variant="ghost"
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
          </Button>
        )
      },
      {
        className: "text-right",
        header: "Actions",
        headerClassName: "text-right",
        key: "actions",
        render: (provider) => {
          const isTesting = testingId === provider.id;

          return (
            <div className="flex items-center justify-end gap-1">
              <Tooltip content="Test connection">
                <Button
                  disabled={isTesting}
                  onClick={() => handleTest(provider.id)}
                  size="sm"
                  variant="ghost"
                >
                  {isTesting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4" />
                  )}
                </Button>
              </Tooltip>
              <Tooltip content="Edit provider">
                <Button
                  onClick={() => onEdit(provider)}
                  size="sm"
                  variant="ghost"
                >
                  <Pencil className="size-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Delete provider">
                <Button
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(provider.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </Tooltip>
            </div>
          );
        }
      }
    ],
    [onToggleEnabled, handleTest, onEdit, onDelete, testingId]
  );

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
