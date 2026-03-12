"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Input, Modal, Switch } from "@raven/ui";
import { Select } from "@/components/select";
import type { Provider } from "../hooks/use-providers";
import { PROVIDER_LABELS, PROVIDER_OPTIONS, useCreateProvider, useUpdateProvider } from "../hooks/use-providers";

interface FormState {
  provider: string;
  name: string;
  apiKey: string;
  isEnabled: boolean;
}

const DEFAULT_FORM: FormState = { apiKey: "", isEnabled: true, name: "", provider: "openai" };

interface ProviderFormProps {
  open: boolean;
  onClose: () => void;
  editingProvider?: Provider | null;
}

const ProviderForm = ({ open, onClose, editingProvider }: ProviderFormProps) => {
  const isEdit = !!editingProvider;
  const [form, setForm] = useState<FormState>(() =>
    editingProvider
      ? { apiKey: "", isEnabled: editingProvider.isEnabled, name: editingProvider.name ?? "", provider: editingProvider.provider }
      : DEFAULT_FORM
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateProvider();
  const updateMutation = useUpdateProvider();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const update = (field: keyof FormState, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setShowApiKey(false);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isEdit && !form.apiKey.trim()) { setFormError("API key is required"); return; }

    try {
      if (isEdit && editingProvider) {
        const body: { apiKey?: string; isEnabled?: boolean; name?: string } = {
          isEnabled: form.isEnabled, name: form.name.trim() || undefined
        };
        if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
        await updateMutation.mutateAsync({ id: editingProvider.id, ...body });
      } else {
        await createMutation.mutateAsync({
          apiKey: form.apiKey.trim(), isEnabled: form.isEnabled,
          name: form.name.trim() || undefined, provider: form.provider
        });
      }
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? "Edit Provider" : "Add Provider"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="provider-select">Provider</label>
          <Select disabled={isEdit} id="provider-select" onChange={(v) => update("provider", v)} options={PROVIDER_OPTIONS} searchable value={form.provider} />
        </div>

        <Input
          id="provider-name" label="Name" description="Optional"
          onChange={(e) => update("name", e.target.value)}
          placeholder={`e.g. Production ${PROVIDER_LABELS[form.provider] ?? form.provider}`}
          value={form.name}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="api-key-input">
            API Key{isEdit && " (leave blank to keep existing)"}
          </label>
          <div className="relative">
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              id="api-key-input" onChange={(e) => update("apiKey", e.target.value)}
              placeholder={isEdit ? "--------" : "sk-..."} type={showApiKey ? "text" : "password"} value={form.apiKey}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowApiKey((v) => !v)} tabIndex={-1} type="button"
            >
              {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Switch checked={form.isEnabled} onCheckedChange={(checked) => update("isEnabled", checked)} label="Enable this provider" />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose} type="button">Cancel</Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            {isSubmitting ? (isEdit ? "Saving..." : "Validating & adding...") : (isEdit ? "Save Changes" : "Add Provider")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { ProviderForm };
