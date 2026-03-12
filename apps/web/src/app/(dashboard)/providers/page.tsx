"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useEventStream } from "@/hooks/use-event-stream";
import { ProviderList } from "./components/provider-list";
import { ProviderForm } from "./components/provider-form";
import {
  providersQueryOptions,
  useDeleteProvider,
  useUpdateProvider,
  type Provider
} from "./hooks/use-providers";

const ProvidersPage = () => {
  const { data: providers = [], isLoading, error, refetch } = useQuery(
    providersQueryOptions()
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateMutation = useUpdateProvider();
  const deleteMutation = useDeleteProvider();

  useEventStream({
    enabled: !isLoading,
    events: ["provider.created", "provider.updated", "provider.deleted"],
    onEvent: () => refetch()
  });

  const handleToggleEnabled = (provider: Provider) => {
    updateMutation.mutate({ id: provider.id, isEnabled: !provider.isEnabled });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Configure your AI provider API keys."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add Provider
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <ProviderList
        providers={providers}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onEdit={(p) => setEditingProvider(p)}
        onDelete={(id) => setDeleteId(id)}
        onToggleEnabled={handleToggleEnabled}
      />

      <ProviderForm
        open={formOpen || !!editingProvider}
        onClose={() => {
          setFormOpen(false);
          setEditingProvider(null);
        }}
        editingProvider={editingProvider}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Provider"
        description="Are you sure you want to delete this provider? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default ProvidersPage;
