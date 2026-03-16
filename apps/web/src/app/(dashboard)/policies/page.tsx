"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PolicyForm } from "./components/policy-form";
import { PolicyList } from "./components/policy-list";
import {
  type Policy,
  policiesQueryOptions,
  useDeletePolicy
} from "./hooks/use-policies";

const PoliciesPage = () => {
  const {
    data: policies = [],
    error,
    isLoading
  } = useQuery(policiesQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeletePolicy();

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
            Add Policy
          </Button>
        }
        description="Define and manage policies to enforce compliance and governance rules."
        title="Policies"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <PolicyList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(p) => setEditingPolicy(p)}
        policies={policies}
      />

      <PolicyForm
        editingPolicy={editingPolicy}
        key={editingPolicy?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingPolicy(null);
        }}
        open={formOpen || !!editingPolicy}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this policy? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Policy"
      />
    </div>
  );
};

export default PoliciesPage;
