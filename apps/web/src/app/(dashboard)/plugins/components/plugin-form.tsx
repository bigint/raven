"use client";

import { Button, Input, Modal, Textarea } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { Plugin } from "../hooks/use-plugins";
import { useCreatePlugin, useUpdatePlugin } from "../hooks/use-plugins";

const HOOK_OPTIONS = [
  { label: "Pre Request", value: "pre_request" },
  { label: "Post Response", value: "post_response" },
  { label: "On Error", value: "on_error" },
  { label: "On Stream", value: "on_stream" }
];

interface FormState {
  name: string;
  description: string;
  version: string;
  hooks: string[];
}

const DEFAULT_FORM: FormState = {
  description: "",
  hooks: [],
  name: "",
  version: "1.0.0"
};

interface PluginFormProps {
  open: boolean;
  onClose: () => void;
  editingPlugin?: Plugin | null;
}

const PluginForm = ({ open, onClose, editingPlugin }: PluginFormProps) => {
  const isEdit = !!editingPlugin;
  const [form, setForm] = useState<FormState>(() =>
    editingPlugin
      ? {
          description: editingPlugin.description ?? "",
          hooks: editingPlugin.hooks,
          name: editingPlugin.name,
          version: editingPlugin.version
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreatePlugin();
  const updateMutation = useUpdatePlugin();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const update = (field: keyof FormState, value: string | string[]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleHook = (hook: string) => {
    setForm((f) => ({
      ...f,
      hooks: f.hooks.includes(hook)
        ? f.hooks.filter((h) => h !== hook)
        : [...f.hooks, hook]
    }));
  };

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

    try {
      if (isEdit && editingPlugin) {
        await updateMutation.mutateAsync({
          id: editingPlugin.id,
          name: form.name.trim()
        });
      } else {
        await createMutation.mutateAsync({
          description: form.description.trim() || undefined,
          hooks: form.hooks.length > 0 ? form.hooks : undefined,
          name: form.name.trim(),
          version: form.version.trim() || undefined
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
      title={isEdit ? "Edit Plugin" : "Create Plugin"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="plugin-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Rate Limiter"
          value={form.name}
        />

        <Textarea
          id="plugin-description"
          label="Description (optional)"
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe what this plugin does..."
          rows={3}
          value={form.description}
        />

        {!isEdit && (
          <>
            <Input
              id="plugin-version"
              label="Version"
              onChange={(e) => update("version", e.target.value)}
              placeholder="e.g. 1.0.0"
              value={form.version}
            />

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="plugin-hooks"
              >
                Hooks
              </label>
              <div className="flex flex-wrap gap-2">
                {HOOK_OPTIONS.map((hook) => (
                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.hooks.includes(hook.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                    key={hook.value}
                    onClick={() => toggleHook(hook.value)}
                    type="button"
                  >
                    {hook.label}
                  </button>
                ))}
              </div>
            </div>
          </>
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
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Plugin"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { PluginForm };
