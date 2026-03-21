"use client";

import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import { DEFAULT_MODELS } from "@raven/data";
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
  models: string[];
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
          models: editingProvider.models ?? [],
          name: editingProvider.name ?? "",
          provider: editingProvider.provider
        }
      : { apiKey: "", isEnabled: true, models: [], name: "", provider: "" }
  );

  useEffect(() => {
    if (!isEdit && !form.provider && defaultProvider) {
      setForm((f) => ({
        ...f,
        models: DEFAULT_MODELS[defaultProvider] ?? [],
        provider: defaultProvider
      }));
    }
  }, [defaultProvider, isEdit, form.provider]);

  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modelInput, setModelInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const all = DEFAULT_MODELS[form.provider] ?? [];
    const available = all.filter((m) => !form.models.includes(m));
    if (!modelInput) return available;
    return available.filter((m) =>
      m.toLowerCase().includes(modelInput.toLowerCase())
    );
  }, [form.provider, form.models, modelInput]);

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
  const update = (field: keyof FormState, value: string | boolean | string[]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const addModel = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !form.models.includes(trimmed)) {
      update("models", [...form.models, trimmed]);
    }
    setModelInput("");
    setHighlightedIndex(-1);
  };

  const removeModel = (model: string) => {
    update("models", form.models.filter((m) => m !== model));
  };

  const handleModelKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((i) =>
        i < suggestions.length - 1 ? i + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) =>
        i > 0 ? i - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        addModel(suggestions[highlightedIndex]);
      } else {
        addModel(modelInput);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && !modelInput && form.models.length > 0) {
      removeModel(form.models[form.models.length - 1]!);
    }
  };

  const handleModelPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const items = text.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
    const unique = items.filter((item) => !form.models.includes(item));
    if (unique.length > 0) {
      update("models", [...form.models, ...unique]);
    }
    setModelInput("");
  };

  const handleClose = () => {
    setForm({
      apiKey: "",
      isEnabled: true,
      models: [],
      name: "",
      provider: defaultProvider
    });
    setShowApiKey(false);
    setFormError(null);
    setModelInput("");
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isEdit && !form.apiKey.trim()) {
      setFormError("API key is required");
      return;
    }
    if (form.models.length === 0) {
      setFormError("At least one model is required");
      return;
    }

    try {
      if (isEdit && editingProvider) {
        const body: { apiKey?: string; isEnabled?: boolean; models?: string[]; name?: string } = {
          isEnabled: form.isEnabled,
          models: form.models,
          name: form.name.trim() || undefined
        };
        if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
        await updateMutation.mutateAsync({ id: editingProvider.id, ...body });
      } else {
        await createMutation.mutateAsync({
          apiKey: form.apiKey.trim(),
          isEnabled: form.isEnabled,
          models: form.models,
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
            onChange={(v) => {
              update("provider", v);
              if (!isEdit) update("models", DEFAULT_MODELS[v] ?? []);
            }}
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="models-input">
            Models
          </label>
          <div className="relative">
            <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-ring">
              {form.models.map((model) => (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                  key={model}
                >
                  {model}
                  <button
                    className="rounded-sm hover:bg-primary-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeModel(model);
                    }}
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                id="models-input"
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onChange={(e) => {
                  setModelInput(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleModelKeyDown}
                onPaste={handleModelPaste}
                placeholder={form.models.length === 0 ? "Search or type a model ID..." : "Add more..."}
                ref={modelInputRef}
                value={modelInput}
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md"
                ref={suggestionsRef}
              >
                {suggestions.map((model, i) => (
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${i === highlightedIndex ? "bg-accent" : ""}`}
                    key={model}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addModel(model);
                    }}
                    type="button"
                  >
                    <Check className={`size-3.5 ${form.models.includes(model) ? "opacity-100" : "opacity-0"}`} />
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Select from suggestions or type a custom model ID and press Enter.
          </p>
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
