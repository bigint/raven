"use client";

import { Button, Input, Modal, Select } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import { useModelOptions } from "@/lib/use-models";
import { useCreateModelAlias } from "../hooks/use-model-aliases";

interface ModelAliasFormProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  alias: string;
  targetModel: string;
}

const DEFAULT_FORM: FormState = {
  alias: "",
  targetModel: ""
};

const ModelAliasForm = ({ open, onClose }: ModelAliasFormProps) => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const modelOptions = useModelOptions();
  const createMutation = useCreateModelAlias();
  const isSubmitting = createMutation.isPending;

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

    if (!form.alias.trim()) {
      setFormError("Alias is required");
      return;
    }
    if (!form.targetModel.trim()) {
      setFormError("Target model is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        alias: form.alias.trim(),
        targetModel: form.targetModel.trim()
      });
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal onClose={handleClose} open={open} title="Create Alias">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="alias"
          label="Alias"
          onChange={(e) => update("alias", e.target.value)}
          placeholder="e.g. my-fast-model"
          value={form.alias}
        />

        <Select
          id="target-model"
          label="Target Model"
          onChange={(v) => update("targetModel", v)}
          options={modelOptions}
          placeholder="Select a model..."
          searchable
          value={form.targetModel}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <TextMorph>
              {isSubmitting ? "Creating..." : "Create Alias"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { ModelAliasForm };
