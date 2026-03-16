"use client";

import { Button, Input, Modal, Select } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { CatalogItem } from "../hooks/use-catalog";
import {
  TYPE_OPTIONS,
  useCreateCatalogItem,
  useUpdateCatalogItem
} from "../hooks/use-catalog";

interface FormState {
  name: string;
  description: string;
  type: string;
  version: string;
  tags: string;
}

const DEFAULT_FORM: FormState = {
  description: "",
  name: "",
  tags: "",
  type: "model",
  version: ""
};

interface CatalogFormProps {
  editingItem?: CatalogItem | null;
  onClose: () => void;
  open: boolean;
}

const CatalogForm = ({ editingItem, onClose, open }: CatalogFormProps) => {
  const isEdit = !!editingItem;
  const [form, setForm] = useState<FormState>(() =>
    editingItem
      ? {
          description: editingItem.description ?? "",
          name: editingItem.name,
          tags: editingItem.tags.join(", "),
          type: editingItem.type,
          version: editingItem.version
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCatalogItem();
  const updateMutation = useUpdateCatalogItem();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
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

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!form.version.trim()) {
      setFormError("Version is required");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const body = {
      description: form.description.trim() || undefined,
      name: form.name.trim(),
      tags: tags.length > 0 ? tags : undefined,
      type: form.type,
      version: form.version.trim()
    };

    try {
      if (isEdit && editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...body });
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
      title={isEdit ? "Edit Catalog Item" : "Add Catalog Item"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="catalog-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. GPT-4o"
          value={form.name}
        />

        <Input
          description="Optional"
          id="catalog-description"
          label="Description"
          onChange={(e) => update("description", e.target.value)}
          placeholder="e.g. Latest GPT-4 model with vision capabilities"
          value={form.description}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="catalog-type">
            Type
          </label>
          <Select
            id="catalog-type"
            onChange={(v) => update("type", v)}
            options={TYPE_OPTIONS}
            value={form.type}
          />
        </div>

        <Input
          id="catalog-version"
          label="Version"
          onChange={(e) => update("version", e.target.value)}
          placeholder="e.g. 1.0.0"
          value={form.version}
        />

        <Input
          description="Comma-separated list"
          id="catalog-tags"
          label="Tags"
          onChange={(e) => update("tags", e.target.value)}
          placeholder="e.g. production, vision, multimodal"
          value={form.tags}
        />

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
                  : "Add Item"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { CatalogForm };
