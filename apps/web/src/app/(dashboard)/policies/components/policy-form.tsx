"use client";

import { Button, Input, Modal, Select, Switch, Textarea } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { Policy } from "../hooks/use-policies";
import {
  COMPLIANCE_FRAMEWORKS,
  SCOPE_OPTIONS,
  useCreatePolicy,
  useUpdatePolicy
} from "../hooks/use-policies";

interface FormState {
  complianceFrameworks: string[];
  description: string;
  isEnabled: boolean;
  name: string;
  scope: string;
}

const DEFAULT_FORM: FormState = {
  complianceFrameworks: [],
  description: "",
  isEnabled: true,
  name: "",
  scope: "organization"
};

const extractFormFromPolicy = (p: Policy): FormState => ({
  complianceFrameworks: p.complianceFrameworks,
  description: p.description ?? "",
  isEnabled: p.isEnabled,
  name: p.name,
  scope: p.scope
});

interface PolicyFormProps {
  editingPolicy?: Policy | null;
  onClose: () => void;
  open: boolean;
}

const PolicyForm = ({ editingPolicy, onClose, open }: PolicyFormProps) => {
  const isEdit = !!editingPolicy;
  const [form, setForm] = useState<FormState>(() =>
    editingPolicy ? extractFormFromPolicy(editingPolicy) : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
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
      complianceFrameworks: form.complianceFrameworks,
      description: form.description.trim() || undefined,
      isEnabled: form.isEnabled,
      name: form.name.trim(),
      scope: form.scope
    };

    try {
      if (isEdit && editingPolicy) {
        await updateMutation.mutateAsync({
          id: editingPolicy.id,
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
      title={isEdit ? "Edit Policy" : "Add Policy"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="policy-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Data Protection Policy"
          value={form.name}
        />

        <Textarea
          id="policy-description"
          label="Description"
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe what this policy enforces..."
          rows={3}
          value={form.description}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="policy-scope">
            Scope
          </label>
          <Select
            id="policy-scope"
            onChange={(v) => update("scope", v)}
            options={SCOPE_OPTIONS}
            value={form.scope}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Compliance Frameworks</legend>
          {COMPLIANCE_FRAMEWORKS.map((fw) => (
            <label className="flex items-center gap-2 text-sm" key={fw.id}>
              <input
                checked={form.complianceFrameworks.includes(fw.id)}
                className="size-4 rounded border-input accent-primary"
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...form.complianceFrameworks, fw.id]
                    : form.complianceFrameworks.filter((f) => f !== fw.id);
                  setForm((f) => ({ ...f, complianceFrameworks: next }));
                }}
                type="checkbox"
              />
              {fw.label}
            </label>
          ))}
        </fieldset>

        <Switch
          checked={form.isEnabled}
          label="Enabled"
          onCheckedChange={(checked) => update("isEnabled", checked)}
        />

        {isEdit && editingPolicy && (
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            This policy has {editingPolicy.rules.length} rule
            {editingPolicy.rules.length === 1 ? "" : "s"} configured.
          </div>
        )}

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
                  : "Add Policy"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { PolicyForm };
