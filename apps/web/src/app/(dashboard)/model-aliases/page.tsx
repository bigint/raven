"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ModelAliasForm } from "./components/model-alias-form";
import { ModelAliasList } from "./components/model-alias-list";
import {
  modelAliasesQueryOptions,
  useDeleteModelAlias
} from "./hooks/use-model-aliases";

const ModelAliasesPage = () => {
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
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Create Alias
          </Button>
        }
        description="Create custom model names that map to actual models."
        title="Model Aliases"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <ModelAliasList
        aliases={aliases}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
      />

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
