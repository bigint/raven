"use client";

import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import { useModelOptions } from "@/lib/use-models";
import type { RoutingRule } from "../hooks/use-routing-rules";
import {
  CONDITION_OPTIONS,
  useCreateRoutingRule,
  useUpdateRoutingRule
} from "../hooks/use-routing-rules";

interface FormState {
  name: string;
  sourceModel: string;
  targetModel: string;
  condition: string;
  conditionValue: string;
  priority: string;
  isEnabled: boolean;
}

const DEFAULT_FORM: FormState = {
  condition: "token_count_below",
  conditionValue: "",
  isEnabled: true,
  name: "",
  priority: "0",
  sourceModel: "",
  targetModel: ""
};

interface RoutingRuleFormProps {
  open: boolean;
  onClose: () => void;
  editingRule?: RoutingRule | null;
}

const RoutingRuleForm = ({
  open,
  onClose,
  editingRule
}: RoutingRuleFormProps) => {
  const isEdit = !!editingRule;
  const [form, setForm] = useState<FormState>(() =>
    editingRule
      ? {
          condition: editingRule.condition,
          conditionValue: editingRule.conditionValue,
          isEnabled: editingRule.isEnabled,
          name: editingRule.name,
          priority: String(editingRule.priority),
          sourceModel: editingRule.sourceModel,
          targetModel: editingRule.targetModel
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const modelOptions = useModelOptions();
  const createMutation = useCreateRoutingRule();
  const updateMutation = useUpdateRoutingRule();
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
    if (!form.sourceModel.trim()) {
      setFormError("Source model is required");
      return;
    }
    if (!form.targetModel.trim()) {
      setFormError("Target model is required");
      return;
    }
    if (!form.conditionValue.trim()) {
      setFormError("Condition value is required");
      return;
    }

    const priorityVal = Number(form.priority);
    if (Number.isNaN(priorityVal)) {
      setFormError("Priority must be a valid number");
      return;
    }

    const body = {
      condition: form.condition,
      conditionValue: form.conditionValue.trim(),
      isEnabled: form.isEnabled,
      name: form.name.trim(),
      priority: priorityVal,
      sourceModel: form.sourceModel.trim(),
      targetModel: form.targetModel.trim()
    };

    try {
      if (isEdit && editingRule) {
        await updateMutation.mutateAsync({ id: editingRule.id, ...body });
      } else {
        await createMutation.mutateAsync(body);
      }
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const conditionValuePlaceholder =
    form.condition === "keyword_match" ? "error, timeout, retry" : "1000";

  const conditionValueType =
    form.condition === "keyword_match" ? "text" : "number";

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={isEdit ? "Edit Routing Rule" : "Add Routing Rule"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Route small requests"
          value={form.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            id="source-model"
            label="Source Model"
            onChange={(v) => update("sourceModel", v)}
            options={modelOptions}
            placeholder="Select model..."
            searchable
            value={form.sourceModel}
          />
          <Select
            id="target-model"
            label="Target Model"
            onChange={(v) => update("targetModel", v)}
            options={modelOptions}
            placeholder="Select model..."
            searchable
            value={form.targetModel}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="condition">
            Condition
          </label>
          <Select
            id="condition"
            onChange={(v) => update("condition", v)}
            options={CONDITION_OPTIONS}
            value={form.condition}
          />
        </div>

        <Input
          id="condition-value"
          label="Condition Value"
          onChange={(e) => update("conditionValue", e.target.value)}
          placeholder={conditionValuePlaceholder}
          type={conditionValueType}
          value={form.conditionValue}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="priority"
            label="Priority"
            min="0"
            onChange={(e) => update("priority", e.target.value)}
            placeholder="0"
            type="number"
            value={form.priority}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="is-enabled">
              Enabled
            </label>
            <div className="pt-1.5">
              <Switch
                checked={form.isEnabled}
                onCheckedChange={(v) => update("isEnabled", v)}
              />
            </div>
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
                  : "Add Rule"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { RoutingRuleForm };
