"use client";

import { Button, Input, Modal, Select } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { TextMorph } from "torph/react";
import { keysQueryOptions } from "../../keys/hooks/use-keys";
import type { Budget } from "../hooks/use-budgets";
import {
  ENTITY_TYPE_OPTIONS,
  PERIOD_OPTIONS,
  useCreateBudget,
  useUpdateBudget
} from "../hooks/use-budgets";

interface FormState {
  entityType: string;
  entityId: string;
  limitAmount: string;
  period: string;
  alertThreshold: string;
}

const DEFAULT_FORM: FormState = {
  alertThreshold: "80",
  entityId: "*",
  entityType: "organization",
  limitAmount: "100",
  period: "monthly"
};

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  editingBudget?: Budget | null;
}

const BudgetForm = ({ open, onClose, editingBudget }: BudgetFormProps) => {
  const isEdit = !!editingBudget;
  const [form, setForm] = useState<FormState>(() =>
    editingBudget
      ? {
          alertThreshold: String(
            Math.round(Number(editingBudget.alertThreshold) * 100)
          ),
          entityId: editingBudget.entityId,
          entityType: editingBudget.entityType,
          limitAmount: String(editingBudget.limitAmount),
          period: editingBudget.period
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const { data: keys } = useQuery(keysQueryOptions());

  const entityOptions = useMemo(() => {
    if (form.entityType === "key") {
      return (keys ?? []).map((k) => ({
        label: `${k.name} (${k.keyPrefix}...)`,
        value: k.id
      }));
    }
    return [];
  }, [form.entityType, keys]);

  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const update = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.limitAmount.trim() || Number.isNaN(Number(form.limitAmount))) {
      setFormError("Limit amount must be a valid number");
      return;
    }
    if (form.entityType !== "organization" && !form.entityId.trim()) {
      setFormError("Please select an API key");
      return;
    }
    const alertVal = Number(form.alertThreshold);
    if (Number.isNaN(alertVal) || alertVal < 0 || alertVal > 100) {
      setFormError("Alert threshold must be between 0 and 100");
      return;
    }

    const body = {
      alertThreshold: alertVal / 100,
      entityId: form.entityType === "organization" ? "*" : form.entityId.trim(),
      entityType: form.entityType,
      limitAmount: Number(form.limitAmount),
      period: form.period
    };

    try {
      if (isEdit && editingBudget) {
        await updateMutation.mutateAsync({ id: editingBudget.id, ...body });
      } else {
        await createMutation.mutateAsync(body);
      }
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={isEdit ? "Edit Budget" : "Add Budget"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="entity-type">
            Entity Type
          </label>
          <Select
            id="entity-type"
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                entityId: v === "organization" ? "*" : "",
                entityType: v
              }));
            }}
            options={ENTITY_TYPE_OPTIONS}
            value={form.entityType}
          />
        </div>

        {form.entityType === "key" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="entity-id">
              API Key
            </label>
            <Select
              id="entity-id"
              onChange={(v) => update("entityId", v)}
              options={entityOptions}
              placeholder="Select an API key"
              value={form.entityId}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="limit-amount"
            label="Limit ($)"
            min="0"
            onChange={(e) => update("limitAmount", e.target.value)}
            placeholder="100.00"
            step="0.01"
            type="number"
            value={form.limitAmount}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="period">
              Period
            </label>
            <Select
              id="period"
              onChange={(v) => update("period", v)}
              options={PERIOD_OPTIONS}
              value={form.period}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="alert-threshold">
            Alert Threshold ({form.alertThreshold}%)
          </label>
          <input
            className="w-full accent-primary"
            id="alert-threshold"
            max="100"
            min="0"
            onChange={(e) => update("alertThreshold", e.target.value)}
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
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <TextMorph>
              {isSubmitting
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save Changes"
                  : "Add Budget"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { BudgetForm };
