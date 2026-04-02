"use client";

import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { useState } from "react";
import type {
  Collection,
  CreateCollectionInput
} from "../../hooks/use-collections";
import {
  useCreateCollection,
  useUpdateCollection
} from "../../hooks/use-collections";

const EMBEDDING_MODEL_OPTIONS = [
  { label: "text-embedding-3-small", value: "text-embedding-3-small" },
  { label: "text-embedding-3-large", value: "text-embedding-3-large" }
];

interface FormState {
  name: string;
  description: string;
  embeddingModel: string;
  chunkSize: string;
  chunkOverlap: string;
  topK: string;
  similarityThreshold: string;
  maxContextTokens: string;
  rerankingEnabled: boolean;
  isDefault: boolean;
}

const DEFAULT_FORM: FormState = {
  chunkOverlap: "20",
  chunkSize: "512",
  description: "",
  embeddingModel: "text-embedding-3-small",
  isDefault: false,
  maxContextTokens: "4096",
  name: "",
  rerankingEnabled: false,
  similarityThreshold: "0.3",
  topK: "5"
};

const extractFormFromCollection = (c: Collection): FormState => ({
  chunkOverlap: DEFAULT_FORM.chunkOverlap,
  chunkSize: DEFAULT_FORM.chunkSize,
  description: c.description ?? "",
  embeddingModel: DEFAULT_FORM.embeddingModel,
  isDefault: c.isDefault,
  maxContextTokens: String(c.maxContextTokens),
  name: c.name,
  rerankingEnabled: c.rerankingEnabled,
  similarityThreshold: String(c.similarityThreshold),
  topK: String(c.topK)
});

interface CollectionFormProps {
  readonly mode: "create" | "edit" | null;
  readonly editingCollection: Collection | null;
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

    try {
      if (isEdit && editingCollection) {
        await updateMutation.mutateAsync({
          description: form.description.trim() || undefined,
          id: editingCollection.id,
          isDefault: form.isDefault,
          maxContextTokens: Number(form.maxContextTokens),
          name: form.name.trim(),
          rerankingEnabled: form.rerankingEnabled,
          similarityThreshold: Number(form.similarityThreshold),
          topK: Number(form.topK)
        });
      } else {
        await createMutation.mutateAsync({
          chunkOverlap: Number(form.chunkOverlap),
          chunkSize: Number(form.chunkSize),
          description: form.description.trim() || undefined,
          embeddingModel: form.embeddingModel,
          isDefault: form.isDefault,
          maxContextTokens: Number(form.maxContextTokens),
          name: form.name.trim(),
          rerankingEnabled: form.rerankingEnabled,
          similarityThreshold: Number(form.similarityThreshold),
          topK: Number(form.topK)
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
          id="collection-name"
          label="Name"
          name="name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Product Documentation"
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
                htmlFor="collection-embedding-model"
              >
                Embedding Model
              </label>
              <Select
                id="collection-embedding-model"
                onChange={(v) => update("embeddingModel", v)}
                options={EMBEDDING_MODEL_OPTIONS}
                value={form.embeddingModel}
              />
            </div>

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
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            autoComplete="off"
            id="collection-top-k"
            label="Top K"
            min="1"
            name="topK"
            onChange={(e) => update("topK", e.target.value)}
            placeholder="5"
            type="number"
            value={form.topK}
          />
          <Input
            autoComplete="off"
            id="collection-similarity-threshold"
            label="Similarity Threshold"
            max="1"
            min="0"
            name="similarityThreshold"
            onChange={(e) => update("similarityThreshold", e.target.value)}
            placeholder="0.7"
            step="0.01"
            type="number"
            value={form.similarityThreshold}
          />
        </div>

        <Input
          autoComplete="off"
          id="collection-max-context-tokens"
          label="Max Context Tokens"
          min="1"
          name="maxContextTokens"
          onChange={(e) => update("maxContextTokens", e.target.value)}
          placeholder="4096"
          type="number"
          value={form.maxContextTokens}
        />

        <Switch
          checked={form.rerankingEnabled}
          label="Reranking Enabled"
          onCheckedChange={(checked) => update("rerankingEnabled", checked)}
        />

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
