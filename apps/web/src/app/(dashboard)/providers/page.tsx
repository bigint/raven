"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProviderForm } from "./components/provider-form";
import { ProviderList } from "./components/provider-list";
import {
  type Provider,
  providersQueryOptions,
  useDeleteProvider,
  useUpdateProvider
} from "./hooks/use-providers";

const ProvidersPage = () => {
  const {
    data: providers = [],
    isLoading,
    error
  } = useQuery(providersQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateMutation = useUpdateProvider();
  const deleteMutation = useDeleteProvider();

  const handleToggleEnabled = (provider: Provider) => {
    updateMutation.mutate({ id: provider.id, isEnabled: !provider.isEnabled });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success("Provider deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add Provider
          </Button>
        }
        description="Configure your AI provider API keys."
        title="Providers"
      />
      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}

      <ProviderList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(p) => setEditingProvider(p)}
        onToggleEnabled={handleToggleEnabled}
        providers={providers}
      />

      <ProviderForm
        editingProvider={editingProvider}
        key={editingProvider?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingProvider(null);
        }}
        open={formOpen || !!editingProvider}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this provider? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Provider"
      />
    </div>
  );
};

export default ProvidersPage;
