"use client";

import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { Agent } from "../hooks/use-agents";
import {
  BUDGET_PERIOD_OPTIONS,
  TYPE_OPTIONS,
  useCreateAgent,
  useUpdateAgent
} from "../hooks/use-agents";

interface FormState {
  name: string;
  description: string;
  type: string;
  budgetMax: string;
  budgetPeriod: string;
  canDelegate: boolean;
}

const DEFAULT_FORM: FormState = {
  budgetMax: "",
  budgetPeriod: "monthly",
  canDelegate: false,
  description: "",
  name: "",
  type: "autonomous"
};

interface AgentFormProps {
  editingAgent?: Agent | null;
  onClose: () => void;
  open: boolean;
}

const AgentForm = ({ editingAgent, onClose, open }: AgentFormProps) => {
  const isEdit = !!editingAgent;
  const [form, setForm] = useState<FormState>(() =>
    editingAgent
      ? {
          budgetMax: editingAgent.budgetMax ?? "",
          budgetPeriod: editingAgent.budgetPeriod ?? "monthly",
          canDelegate: editingAgent.canDelegate,
          description: editingAgent.description ?? "",
          name: editingAgent.name,
          type: editingAgent.type
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const update = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    const body = {
      budgetMax: form.budgetMax.trim() || undefined,
      budgetPeriod: form.budgetMax.trim() ? form.budgetPeriod : undefined,
      canDelegate: form.canDelegate,
      description: form.description.trim() || undefined,
      name: form.name.trim(),
      type: form.type
    };

    try {
      if (isEdit && editingAgent) {
        await updateMutation.mutateAsync({ id: editingAgent.id, ...body });
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
      title={isEdit ? "Edit Agent" : "Add Agent"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="agent-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Research Assistant"
          value={form.name}
        />

        <Input
          description="Optional"
          id="agent-description"
          label="Description"
          onChange={(e) => update("description", e.target.value)}
          placeholder="e.g. Handles research and summarization tasks"
          value={form.description}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="agent-type">
            Type
          </label>
          <Select
            id="agent-type"
            onChange={(v) => update("type", v)}
            options={TYPE_OPTIONS}
            value={form.type}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            description="Optional"
            id="agent-budget-max"
            label="Budget Max"
            onChange={(e) => update("budgetMax", e.target.value)}
            placeholder="e.g. 100.00"
            value={form.budgetMax}
          />
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              htmlFor="agent-budget-period"
            >
              Budget Period
            </label>
            <Select
              id="agent-budget-period"
              onChange={(v) => update("budgetPeriod", v)}
              options={BUDGET_PERIOD_OPTIONS}
              value={form.budgetPeriod}
            />
          </div>
        </div>

        <Switch
          checked={form.canDelegate}
          label="Can delegate to other agents"
          onCheckedChange={(checked) => update("canDelegate", checked)}
        />

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
                  : "Add Agent"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { AgentForm };
