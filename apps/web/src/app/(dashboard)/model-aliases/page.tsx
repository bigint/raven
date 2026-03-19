"use client";

import { Button, ConfirmDialog, EmptyState, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Network, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useSetupStatus } from "@/lib/use-setup-status";
import { ModelAliasForm } from "./components/model-alias-form";
import { ModelAliasList } from "./components/model-alias-list";
import {
  modelAliasesQueryOptions,
  useDeleteModelAlias
} from "./hooks/use-model-aliases";

const ModelAliasesPage = () => {
  const { hasProviders } = useSetupStatus();
  const {
    data: aliases = [],
    isLoading,
    error
  } = useQuery(modelAliasesQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteModelAlias();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success("Model alias deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div>
      <PageHeader
        actions={
          hasProviders ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Create Alias
            </Button>
          ) : undefined
        }
        description="Create custom model names that map to actual models."
        title="Model Aliases"
      />

      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}

      {!hasProviders && !isLoading && aliases.length === 0 ? (
        <EmptyState
          action={
            <Link href="/providers">
              <Button>
                <Network className="size-4" />
                Add Provider
              </Button>
            </Link>
          }
          description="Connect an AI provider to start creating model aliases."
          icon={<Network className="size-8" />}
          title="Connect a provider first"
        />
      ) : (
        <ModelAliasList
          aliases={aliases}
          loading={isLoading}
          onAdd={() => setFormOpen(true)}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      <ModelAliasForm
        key={formOpen ? "open" : "closed"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this model alias? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Model Alias"
      />
    </div>
  );
};

export default ModelAliasesPage;
