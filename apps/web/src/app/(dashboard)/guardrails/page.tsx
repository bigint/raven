"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { GuardrailForm } from "./components/guardrail-form";
import { GuardrailList } from "./components/guardrail-list";
import {
  type Guardrail,
  guardrailsQueryOptions,
  useDeleteGuardrail
} from "./hooks/use-guardrails";

const GuardrailsPage = () => {
  const {
    data: guardrails = [],
    isLoading,
    error,
    refetch
  } = useQuery(guardrailsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteGuardrail();

  useEventStream({
    enabled: !isLoading,
    events: ["guardrail.created", "guardrail.updated", "guardrail.deleted"],
    onEvent: () => refetch()
  });

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
            Add Guardrail
          </Button>
        }
        description="Configure rules to filter and moderate AI requests and responses."
        title="Guardrails"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <GuardrailList
        guardrails={guardrails}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(g) => setEditingGuardrail(g)}
      />

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
