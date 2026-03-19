"use client";

import { Button, ConfirmDialog, EmptyState, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Network, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useSetupStatus } from "@/lib/use-setup-status";
import { GuardrailForm } from "./components/guardrail-form";
import { GuardrailList } from "./components/guardrail-list";
import {
  type Guardrail,
  guardrailsQueryOptions,
  useDeleteGuardrail
} from "./hooks/use-guardrails";

const GuardrailsPage = () => {
  const { hasProviders } = useSetupStatus();
  const {
    data: guardrails = [],
    isLoading,
    error
  } = useQuery(guardrailsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteGuardrail();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success("Guardrail deleted");
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
              Add Guardrail
            </Button>
          ) : undefined
        }
        description="Configure rules to filter and moderate AI requests and responses."
        title="Guardrails"
      />

      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}

      {!hasProviders && !isLoading && guardrails.length === 0 ? (
        <EmptyState
          action={
            <Link href="/providers">
              <Button>
                <Network className="size-4" />
                Add Provider
              </Button>
            </Link>
          }
          description="Connect an AI provider to configure guardrails."
          icon={<Network className="size-8" />}
          title="Connect a provider first"
        />
      ) : (
        <GuardrailList
          guardrails={guardrails}
          loading={isLoading}
          onAdd={() => setFormOpen(true)}
          onDelete={(id) => setDeleteId(id)}
          onEdit={(g) => setEditingGuardrail(g)}
        />
      )}

      <GuardrailForm
        editingGuardrail={editingGuardrail}
        key={editingGuardrail?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingGuardrail(null);
        }}
        open={formOpen || !!editingGuardrail}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this guardrail? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Guardrail"
      />
    </div>
  );
};

export default GuardrailsPage;
