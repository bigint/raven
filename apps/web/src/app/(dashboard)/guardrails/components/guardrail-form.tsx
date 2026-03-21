"use client";

import { Button, Input, Modal, Select, Switch, Textarea } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import { match } from "ts-pattern";
import type { Guardrail } from "../hooks/use-guardrails";
import {
  ACTION_OPTIONS,
  TYPE_OPTIONS,
  useCreateGuardrail,
  useUpdateGuardrail
} from "../hooks/use-guardrails";

const PII_TYPES = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "ssn", label: "SSN" },
  { id: "creditCard", label: "Credit Card" },
  { id: "ipAddress", label: "IP Address" }
];

interface FormState {
  name: string;
  type: string;
  action: string;
  priority: string;
  isEnabled: boolean;
  topics: string;
  categories: string;
  pattern: string;
  piiTypes: string[];
}

const DEFAULT_FORM: FormState = {
  action: "block",
  categories: "",
  isEnabled: true,
  name: "",
  pattern: "",
  piiTypes: PII_TYPES.map((t) => t.id),
  priority: "0",
  topics: "",
  type: "pii_detection"
};

const buildConfig = (form: FormState): Record<string, unknown> => {
  switch (form.type) {
    case "block_topics":
      return {
        topics: form.topics
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean)
      };
    case "pii_detection":
      return { piiTypes: form.piiTypes };
    case "content_filter":
      return {
        categories: form.categories
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean)
      };
    case "custom_regex":
      return { pattern: form.pattern };
    default:
      return {};
  }
};

const extractFormFromGuardrail = (g: Guardrail): FormState => ({
  action: g.action,
  categories:
    g.type === "content_filter"
      ? ((g.config as { categories?: string[] }).categories ?? []).join("\n")
      : "",
  isEnabled: g.isEnabled,
  name: g.name,
  pattern:
    g.type === "custom_regex"
      ? ((g.config as { pattern?: string }).pattern ?? "")
      : "",
  piiTypes:
    g.type === "pii_detection"
      ? ((g.config as { piiTypes?: string[] }).piiTypes ??
        PII_TYPES.map((t) => t.id))
      : PII_TYPES.map((t) => t.id),
  priority: String(g.priority),
  topics:
    g.type === "block_topics"
      ? ((g.config as { topics?: string[] }).topics ?? []).join("\n")
      : "",
  type: g.type
});

interface GuardrailFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly editingGuardrail?: Guardrail | null;
}

const GuardrailForm = ({
  open,
  onClose,
  editingGuardrail
}: GuardrailFormProps) => {
  const isEdit = !!editingGuardrail;
  const [form, setForm] = useState<FormState>(() =>
    editingGuardrail ? extractFormFromGuardrail(editingGuardrail) : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateGuardrail();
  const updateMutation = useUpdateGuardrail();
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

    const priorityVal = Number(form.priority);
    if (Number.isNaN(priorityVal) || priorityVal < 0) {
      setFormError("Priority must be a non-negative number");
      return;
    }

    if (form.type === "custom_regex" && !form.pattern.trim()) {
      setFormError("Regex pattern is required");
      return;
    }

    const body = {
      action: form.action,
      config: buildConfig(form),
      isEnabled: form.isEnabled,
      name: form.name.trim(),
      priority: priorityVal,
      type: form.type
    };

    try {
      if (isEdit && editingGuardrail) {
        await updateMutation.mutateAsync({
          id: editingGuardrail.id,
          ...body
        });
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
      title={isEdit ? "Edit Guardrail" : "Add Guardrail"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {formError}
          </div>
        )}

        <Input
          id="guardrail-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Block harmful topics"
          value={form.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="guardrail-type">
              Type
            </label>
            <Select
              id="guardrail-type"
              onChange={(v) => update("type", v)}
              options={TYPE_OPTIONS}
              value={form.type}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="guardrail-action">
              Action
            </label>
            <Select
              id="guardrail-action"
              onChange={(v) => update("action", v)}
              options={ACTION_OPTIONS}
              value={form.action}
            />
          </div>
        </div>

        <Input
          id="guardrail-priority"
          label="Priority"
          min="0"
          onChange={(e) => update("priority", e.target.value)}
          placeholder="0"
          type="number"
          value={form.priority}
        />

        <Switch
          checked={form.isEnabled}
          label="Enabled"
          onCheckedChange={(checked) => update("isEnabled", checked)}
        />

        {match(form.type)
          .with("block_topics", () => (
            <Textarea
              id="guardrail-topics"
              label="Topics (one per line)"
              onChange={(e) => update("topics", e.target.value)}
              placeholder={"violence\nhate speech\nself-harm"}
              rows={4}
              value={form.topics}
            />
          ))
          .with("pii_detection", () => (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">PII Types</legend>
              {PII_TYPES.map((pii) => (
                <label className="flex items-center gap-2 text-sm" key={pii.id}>
                  <input
                    checked={form.piiTypes.includes(pii.id)}
                    className="size-4 rounded border-input accent-primary"
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.piiTypes, pii.id]
                        : form.piiTypes.filter((t) => t !== pii.id);
                      setForm((f) => ({ ...f, piiTypes: next }));
                    }}
                    type="checkbox"
                  />
                  {pii.label}
                </label>
              ))}
            </fieldset>
          ))
          .with("content_filter", () => (
            <Textarea
              id="guardrail-categories"
              label="Categories (one per line)"
              onChange={(e) => update("categories", e.target.value)}
              placeholder={"profanity\nsexual content\nviolence"}
              rows={4}
              value={form.categories}
            />
          ))
          .with("custom_regex", () => (
            <Input
              id="guardrail-pattern"
              label="Regex Pattern"
              onChange={(e) => update("pattern", e.target.value)}
              placeholder="e.g. \\b\\d{3}-\\d{2}-\\d{4}\\b"
              value={form.pattern}
            />
          ))
          .otherwise(() => null)}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <TextMorph>
              {match({ isEdit, isSubmitting })
                .with({ isEdit: true, isSubmitting: true }, () => "Saving...")
                .with({ isEdit: false, isSubmitting: true }, () => "Adding...")
                .with({ isEdit: true }, () => "Save Changes")
                .otherwise(() => "Add Guardrail")}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { GuardrailForm };
