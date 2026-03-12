"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Select } from "@/components/select";
import { useEventStream } from "@/hooks/use-event-stream";
import { api } from "@/lib/api";

interface Budget {
  id: string;
  entityType: string;
  entityId: string;
  limitAmount: number;
  period: string;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

const ENTITY_TYPE_OPTIONS = [
  { label: "Organization", value: "organization" },
  { label: "Team", value: "team" },
  { label: "API Key", value: "key" }
];

const PERIOD_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Monthly", value: "monthly" }
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  key: "API Key",
  organization: "Organization",
  team: "Team"
};

type ModalMode = "add" | "edit" | null;

interface FormState {
  entityType: string;
  entityId: string;
  limitAmount: string;
  period: string;
  alertThreshold: string;
}

const DEFAULT_FORM: FormState = {
  alertThreshold: "80",
  entityId: "",
  entityType: "org",
  limitAmount: "",
  period: "monthly"
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Budget[]>("/v1/budgets");
      setBudgets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEventStream({
    enabled: !loading,
    events: ["budget.created", "budget.updated", "budget.deleted"],
    onEvent: () => fetchBudgets()
  });

  const openAdd = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    setEditingId(null);
    setModalMode("add");
  };

  const openEdit = (budget: Budget) => {
    setForm({
      alertThreshold: String(Math.round(Number(budget.alertThreshold) * 100)),
      entityId: budget.entityId,
      entityType: budget.entityType,
      limitAmount: String(budget.limitAmount),
      period: budget.period
    });
    setFormError(null);
    setEditingId(budget.id);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.limitAmount.trim() || Number.isNaN(Number(form.limitAmount))) {
      setFormError("Limit amount must be a valid number");
      return;
    }
    if (!form.entityId.trim()) {
      setFormError("Entity ID is required");
      return;
    }
    const alertVal = Number(form.alertThreshold);
    if (Number.isNaN(alertVal) || alertVal < 0 || alertVal > 100) {
      setFormError("Alert threshold must be between 0 and 100");
      return;
    }

    try {
      setSubmitting(true);
      const body = {
        alertThreshold: alertVal / 100,
        entityId: form.entityId.trim(),
        entityType: form.entityType,
        limitAmount: Number(form.limitAmount),
        period: form.period
      };

      if (modalMode === "add") {
        await api.post<Budget>("/v1/budgets", body);
      } else if (modalMode === "edit" && editingId) {
        await api.put<Budget>(`/v1/budgets/${editingId}`, body);
      }

      await fetchBudgets();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await api.delete(`/v1/budgets/${deleteId}`);
      setBudgets((prev) => prev.filter((b) => b.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget");
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set spending limits and alerts for your organization.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          onClick={openAdd}
          type="button"
        >
          <Plus className="size-4" />
          Add Budget
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading budgets...
          </p>
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No budgets configured yet.</p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={openAdd}
            type="button"
          >
            <Plus className="size-4" />
            Add your first budget
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Entity Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Entity ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Limit
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Period
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Alert Threshold
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget, idx) => (
                <tr
                  className={`transition-colors hover:bg-muted/30 ${idx !== budgets.length - 1 ? "border-b border-border" : ""}`}
                  key={budget.id}
                >
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {ENTITY_TYPE_LABELS[budget.entityType] ??
                        budget.entityType}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-muted-foreground">
                    {budget.entityId}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    ${Number(budget.limitAmount).toFixed(2)}
                  </td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">
                    {budget.period}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{
                            width: `${Number(budget.alertThreshold) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(Number(budget.alertThreshold) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => openEdit(budget)}
                        title="Edit budget"
                        type="button"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(budget.id)}
                        title="Delete budget"
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">
                {modalMode === "add" ? "Add Budget" : "Edit Budget"}
              </h2>
              <button
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={closeModal}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeModal();
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="entity-type">
                  Entity Type
                </label>
                <Select
                  id="entity-type"
                  onChange={(v) => setForm((f) => ({ ...f, entityType: v }))}
                  options={ENTITY_TYPE_OPTIONS}
                  value={form.entityType}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="entity-id">
                  Entity ID
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  id="entity-id"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, entityId: e.target.value }))
                  }
                  placeholder="e.g. org_123 or *"
                  type="text"
                  value={form.entityId}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="limit-amount">
                    Limit ($)
                  </label>
                  <input
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    id="limit-amount"
                    min="0"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, limitAmount: e.target.value }))
                    }
                    placeholder="100.00"
                    step="0.01"
                    type="number"
                    value={form.limitAmount}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="period">
                    Period
                  </label>
                  <Select
                    id="period"
                    onChange={(v) => setForm((f) => ({ ...f, period: v }))}
                    options={PERIOD_OPTIONS}
                    value={form.period}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="alert-threshold"
                >
                  Alert Threshold ({form.alertThreshold}%)
                </label>
                <input
                  className="w-full accent-primary"
                  id="alert-threshold"
                  max="100"
                  min="0"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, alertThreshold: e.target.value }))
                  }
                  step="5"
                  type="range"
                  value={form.alertThreshold}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  onClick={closeModal}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeModal();
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting
                    ? modalMode === "add"
                      ? "Adding..."
                      : "Saving..."
                    : modalMode === "add"
                      ? "Add Budget"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeleteId(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold">Delete Budget</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete this budget? This action cannot
                be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                disabled={deleting}
                onClick={() => setDeleteId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setDeleteId(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={deleting}
                onClick={handleDelete}
                type="button"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
