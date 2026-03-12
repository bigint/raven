"use client";

import { Button, Input, Modal } from "@raven/ui";
import { useState } from "react";
import type { Prompt } from "../hooks/use-prompts";
import { useCreatePrompt, useUpdatePrompt } from "../hooks/use-prompts";

interface FormState {
  name: string;
  content: string;
  model: string;
}

const DEFAULT_FORM: FormState = {
  content: "",
  model: "",
  name: ""
};

interface PromptFormProps {
  open: boolean;
  onClose: () => void;
  editingPrompt?: Prompt | null;
}

const PromptForm = ({ open, onClose, editingPrompt }: PromptFormProps) => {
  const isEdit = !!editingPrompt;
  const [form, setForm] = useState<FormState>(() =>
    editingPrompt
      ? {
          content: "",
          model: "",
          name: editingPrompt.name
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreatePrompt();
  const updateMutation = useUpdatePrompt();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const update = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!isEdit && !form.content.trim()) {
      setFormError("Template content is required");
      return;
    }

    try {
      if (isEdit && editingPrompt) {
        await updateMutation.mutateAsync({
          id: editingPrompt.id,
          name: form.name.trim()
        });
      } else {
        await createMutation.mutateAsync({
          content: form.content.trim(),
          model: form.model.trim() || undefined,
          name: form.name.trim()
        });
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
      title={isEdit ? "Edit Prompt" : "Create Prompt"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="prompt-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Summarize Article"
          value={form.name}
        />

        {!isEdit && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="prompt-content">
                Template Content
              </label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                id="prompt-content"
                onChange={(e) => update("content", e.target.value)}
                placeholder="Enter your prompt template..."
                rows={8}
                value={form.content}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variable}}"} for template variables
              </p>
            </div>

            <Input
              id="prompt-model"
              label="Model (optional)"
              onChange={(e) => update("model", e.target.value)}
              placeholder="e.g. gpt-4o"
              value={form.model}
            />
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Prompt"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { PromptForm };
