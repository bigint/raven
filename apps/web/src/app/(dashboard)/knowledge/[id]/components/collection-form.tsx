"use client";

import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { useState } from "react";
import type { Collection } from "../../hooks/use-collections";
import {
  useCreateCollection,
  useUpdateCollection
} from "../../hooks/use-collections";

const EMBEDDING_PROVIDER_OPTIONS = [
  { label: "OpenAI", value: "openai" },
  { label: "Cohere", value: "cohere" }
];

const OPENAI_MODEL_OPTIONS = [
  { label: "text-embedding-3-small", value: "text-embedding-3-small" },
  { label: "text-embedding-3-large", value: "text-embedding-3-large" }
];

const COHERE_MODEL_OPTIONS = [
  { label: "embed-english-v3.0", value: "embed-english-v3.0" },
  { label: "embed-multilingual-v3.0", value: "embed-multilingual-v3.0" },
  { label: "embed-english-light-v3.0", value: "embed-english-light-v3.0" },
  {
    label: "embed-multilingual-light-v3.0",
    value: "embed-multilingual-light-v3.0"
  }
];

const SEARCH_MODE_OPTIONS = [
  { label: "Semantic", value: "semantic" },
  { label: "Keyword", value: "keyword" },
  { label: "Hybrid", value: "hybrid" }
];

interface FormState {
  name: string;
  description: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingApiKey: string;
  chunkSize: string;
  chunkOverlap: string;
  defaultTopK: string;
  defaultMinScore: string;
  defaultSearchMode: string;
  isDefault: boolean;
}

const DEFAULT_FORM: FormState = {
  chunkOverlap: "20",
  chunkSize: "512",
  defaultMinScore: "",
  defaultSearchMode: "semantic",
  defaultTopK: "10",
  description: "",
  embeddingApiKey: "",
  embeddingModel: "text-embedding-3-small",
  embeddingProvider: "openai",
  isDefault: false,
  name: ""
};

const extractFormFromCollection = (
  c: Collection & { description?: string | null }
): FormState => ({
  chunkOverlap: DEFAULT_FORM.chunkOverlap,
  chunkSize: DEFAULT_FORM.chunkSize,
  defaultMinScore: DEFAULT_FORM.defaultMinScore,
  defaultSearchMode: DEFAULT_FORM.defaultSearchMode,
  defaultTopK: DEFAULT_FORM.defaultTopK,
  description: c.description ?? "",
  embeddingApiKey: "",
  embeddingModel: DEFAULT_FORM.embeddingModel,
  embeddingProvider: DEFAULT_FORM.embeddingProvider,
  isDefault: c.is_default,
  name: c.name
});

interface CollectionFormProps {
  readonly mode: "create" | "edit" | null;
  readonly editingCollection:
    | (Collection & { description?: string | null })
    | null;
  readonly onClose: () => void;
  readonly onSubmit?: () => void;
}

const CollectionForm = ({
  mode,
  editingCollection,
  onClose,
  onSubmit
}: CollectionFormProps) => {
  const isEdit = mode === "edit";
  const open = mode !== null;

  const [form, setForm] = useState<FormState>(() =>
    editingCollection
      ? extractFormFromCollection(editingCollection)
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const update = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(form.name.trim())) {
      setFormError("Name must only contain letters, numbers, and underscores");
      return;
    }

    try {
      if (isEdit && editingCollection) {
        await updateMutation.mutateAsync({
          description: form.description.trim() || undefined,
          id: editingCollection.name,
          is_default: form.isDefault
        });
      } else {
        await createMutation.mutateAsync({
          chunk_overlap: Number(form.chunkOverlap),
          chunk_size: Number(form.chunkSize),
          default_min_score: form.defaultMinScore
            ? Number(form.defaultMinScore)
            : undefined,
          default_search_mode: form.defaultSearchMode || undefined,
          default_top_k: form.defaultTopK
            ? Number(form.defaultTopK)
            : undefined,
          description: form.description.trim() || undefined,
          embedding_api_key: form.embeddingApiKey || undefined,
          embedding_model: form.embeddingModel,
          embedding_provider: form.embeddingProvider,
          is_default: form.isDefault,
          name: form.name.trim()
        });
      }
      onSubmit?.();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={isEdit ? "Edit Collection" : "Create Collection"}
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
          autoComplete="off"
          disabled={isEdit}
          id="collection-name"
          label="Name"
          name="name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. product_docs"
          value={form.name}
        />

        <Input
          autoComplete="off"
          id="collection-description"
          label="Description"
          name="description"
          onChange={(e) => update("description", e.target.value)}
          placeholder="Optional description"
          value={form.description}
        />

        {!isEdit && (
          <>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="collection-embedding-provider"
              >
                Embedding Provider
              </label>
              <Select
                id="collection-embedding-provider"
                onChange={(v) => {
                  update("embeddingProvider", v);
                  update(
                    "embeddingModel",
                    v === "openai"
                      ? "text-embedding-3-small"
                      : "embed-english-v3.0"
                  );
                }}
                options={EMBEDDING_PROVIDER_OPTIONS}
                value={form.embeddingProvider}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="collection-embedding-model"
              >
                Embedding Model
              </label>
              <Select
                id="collection-embedding-model"
                onChange={(v) => update("embeddingModel", v)}
                options={
                  form.embeddingProvider === "cohere"
                    ? COHERE_MODEL_OPTIONS
                    : OPENAI_MODEL_OPTIONS
                }
                value={form.embeddingModel}
              />
            </div>

            <Input
              autoComplete="off"
              id="collection-embedding-api-key"
              label="Embedding API Key"
              name="embeddingApiKey"
              onChange={(e) => update("embeddingApiKey", e.target.value)}
              placeholder="Enter your embedding API key"
              type="password"
              value={form.embeddingApiKey}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                autoComplete="off"
                id="collection-chunk-size"
                label="Chunk Size"
                min="1"
                name="chunkSize"
                onChange={(e) => update("chunkSize", e.target.value)}
                placeholder="512"
                type="number"
                value={form.chunkSize}
              />
              <Input
                autoComplete="off"
                id="collection-chunk-overlap"
                label="Chunk Overlap"
                min="0"
                name="chunkOverlap"
                onChange={(e) => update("chunkOverlap", e.target.value)}
                placeholder="20"
                type="number"
                value={form.chunkOverlap}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                autoComplete="off"
                id="collection-default-top-k"
                label="Default Top K"
                min="1"
                name="defaultTopK"
                onChange={(e) => update("defaultTopK", e.target.value)}
                placeholder="10"
                type="number"
                value={form.defaultTopK}
              />
              <Input
                autoComplete="off"
                id="collection-default-min-score"
                label="Min Similarity Score"
                max="1"
                min="0"
                name="defaultMinScore"
                onChange={(e) => update("defaultMinScore", e.target.value)}
                placeholder="Optional"
                step="0.01"
                type="number"
                value={form.defaultMinScore}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="collection-search-mode"
              >
                Search Mode
              </label>
              <Select
                id="collection-search-mode"
                onChange={(v) => update("defaultSearchMode", v)}
                options={SEARCH_MODE_OPTIONS}
                value={form.defaultSearchMode}
              />
            </div>
          </>
        )}

        <Switch
          checked={form.isDefault}
          label="Default Collection"
          onCheckedChange={(checked) => update("isDefault", checked)}
        />

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
                : "Create Collection"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { CollectionForm };
