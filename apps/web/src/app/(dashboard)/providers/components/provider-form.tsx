"use client";

import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import { ProviderIcon } from "@/components/model-icon";
import type { Provider } from "../hooks/use-providers";
import {
  useAvailableProviders,
  useCreateProvider,
  useUpdateProvider
} from "../hooks/use-providers";

interface FormState {
  provider: string;
  name: string;
  apiKey: string;
  isEnabled: boolean;
}

interface ProviderFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly editingProvider?: Provider | null;
}

const ProviderForm = ({
  open,
  onClose,
  editingProvider
}: ProviderFormProps) => {
  const isEdit = !!editingProvider;
  const { data: availableProviders } = useAvailableProviders();
  const defaultProvider = availableProviders?.[0]?.slug ?? "";

  const [form, setForm] = useState<FormState>(() =>
    editingProvider
      ? {
          apiKey: "",
          isEnabled: editingProvider.isEnabled,
          name: editingProvider.name ?? "",
          provider: editingProvider.provider
        }
      : { apiKey: "", isEnabled: true, name: "", provider: "" }
  );

  useEffect(() => {
    if (!isEdit && !form.provider && defaultProvider) {
      setForm((f) => ({ ...f, provider: defaultProvider }));
    }
  }, [defaultProvider, isEdit, form.provider]);

  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const providerOptionsWithIcons = useMemo(
    () =>
      (availableProviders ?? []).map((p) => ({
        icon: <ProviderIcon provider={p.slug} size={16} />,
        label: p.name,
        value: p.slug
      })),
    [availableProviders]
  );

  const createMutation = useCreateProvider();
  const updateMutation = useUpdateProvider();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const update = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm({
      apiKey: "",
      isEnabled: true,
      name: "",
      provider: defaultProvider
    });
    setShowApiKey(false);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isEdit && !form.apiKey.trim()) {
      setFormError("API key is required");
      return;
    }

    try {
      if (isEdit && editingProvider) {
        const body: { apiKey?: string; isEnabled?: boolean; name?: string } = {
          isEnabled: form.isEnabled,
          name: form.name.trim() || undefined
        };
        if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
        await updateMutation.mutateAsync({ id: editingProvider.id, ...body });
      } else {
        await createMutation.mutateAsync({
          apiKey: form.apiKey.trim(),
          isEnabled: form.isEnabled,
          name: form.name.trim() || undefined,
          provider: form.provider
        });
      }
      toast.success(isEdit ? "Provider updated" : "Provider created");
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={isEdit ? "Edit Provider" : "Add Provider"}
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="provider-select">
            Provider
          </label>
          <Select
            disabled={isEdit}
            id="provider-select"
            onChange={(v) => update("provider", v)}
            options={providerOptionsWithIcons}
            searchable
            value={form.provider}
          />
        </div>

        <Input
          description="Optional"
          id="provider-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder={`e.g. Production ${availableProviders?.find((p) => p.slug === form.provider)?.name ?? form.provider}`}
          value={form.name}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="api-key-input">
            API Key{isEdit && " (leave blank to keep existing)"}
          </label>
          <div className="relative">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              id="api-key-input"
              onChange={(e) => update("apiKey", e.target.value)}
              placeholder={isEdit ? "--------" : "sk-..."}
              type={showApiKey ? "text" : "password"}
              value={form.apiKey}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowApiKey((v) => !v)}
              tabIndex={-1}
              type="button"
            >
              {showApiKey ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Switch
          checked={form.isEnabled}
          label="Enable this provider"
          onCheckedChange={(checked) => update("isEnabled", checked)}
        />

        {isEdit && editingProvider && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Usage</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this config ID in your proxy path to route requests to this
                specific key:
              </p>
            </div>
            <code className="block overflow-x-auto rounded-md bg-background px-3 py-2 text-xs">
              /v1/proxy/{editingProvider.provider}~{editingProvider.id}
              /chat/completions
            </code>
            <p className="text-xs text-muted-foreground">
              Without the config ID, a random key for the provider is used:
            </p>
            <code className="block rounded-md bg-background px-3 py-2 text-xs">
              /v1/proxy/{editingProvider.provider}/chat/completions
            </code>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            <TextMorph>
              {isSubmitting
                ? isEdit
                  ? "Saving..."
                  : "Validating & adding..."
                : isEdit
                  ? "Save Changes"
                  : "Add Provider"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { ProviderForm };
