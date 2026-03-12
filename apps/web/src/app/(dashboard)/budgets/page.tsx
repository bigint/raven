"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useEventStream } from "@/hooks/use-event-stream";
import { BudgetList } from "./components/budget-list";
import { BudgetForm } from "./components/budget-form";
import {
  budgetsQueryOptions,
  useDeleteBudget,
  type Budget
} from "./hooks/use-budgets";

const BudgetsPage = () => {
  const { data: budgets = [], isLoading, error, refetch } = useQuery(
    budgetsQueryOptions()
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteBudget();

  useEventStream({
    enabled: !isLoading,
    events: ["budget.created", "budget.updated", "budget.deleted"],
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
        title="Budgets"
        description="Set spending limits and alerts for your organization."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add Budget
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <BudgetList
        budgets={budgets}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onEdit={(b) => setEditingBudget(b)}
        onDelete={(id) => setDeleteId(id)}
      />

      <BudgetForm
        open={formOpen || !!editingBudget}
        onClose={() => {
          setFormOpen(false);
          setEditingBudget(null);
        }}
        editingBudget={editingBudget}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default BudgetsPage;
