"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { BudgetForm } from "./components/budget-form";
import { BudgetList } from "./components/budget-list";
import {
  type Budget,
  budgetsQueryOptions,
  useDeleteBudget
} from "./hooks/use-budgets";

const BudgetsPage = () => {
  const {
    data: budgets = [],
    isLoading,
    error
  } = useQuery(budgetsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteBudget();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error is handled by toast.promise in the mutation hook
    }
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add Budget
          </Button>
        }
        description="Set spending limits and alerts for your organization."
        title="Budgets"
      />

      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}

      <BudgetList
        budgets={budgets}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(b) => setEditingBudget(b)}
      />

      <BudgetForm
        editingBudget={editingBudget}
        key={editingBudget?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingBudget(null);
        }}
        open={formOpen || !!editingBudget}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Budget"
      />
    </div>
  );
};

export default BudgetsPage;
