"use client";

import { Button, Input, Modal, Select } from "@raven/ui";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import { useCreateExperiment } from "../hooks/use-experiments";

interface VariantRow {
  name: string;
  model: string;
  weight: string;
}

interface FormState {
  name: string;
  description: string;
  primaryMetric: string;
  minimumSamples: string;
  variants: VariantRow[];
}

const METRIC_OPTIONS = [
  { label: "Cost", value: "cost" },
  { label: "Latency", value: "latency" },
  { label: "Error Rate", value: "error_rate" },
  { label: "Quality", value: "quality" }
];

const DEFAULT_VARIANT: VariantRow = { model: "", name: "", weight: "50" };

const DEFAULT_FORM: FormState = {
  description: "",
  minimumSamples: "100",
  name: "",
  primaryMetric: "cost",
  variants: [
    { model: "", name: "Control", weight: "50" },
    { model: "", name: "Variant A", weight: "50" }
  ]
};

interface ExperimentFormProps {
  open: boolean;
  onClose: () => void;
}

export const ExperimentForm = ({ open, onClose }: ExperimentFormProps) => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateExperiment();
  const isSubmitting = createMutation.isPending;

  const updateField = (
    field: keyof Omit<FormState, "variants">,
    value: string
  ) => setForm((f) => ({ ...f, [field]: value }));

  const updateVariant = (
    index: number,
    field: keyof VariantRow,
    value: string
  ) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
    }));

  const addVariant = () =>
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          ...DEFAULT_VARIANT,
          name: `Variant ${String.fromCharCode(65 + f.variants.length - 1)}`
        }
      ]
    }));

  const removeVariant = (index: number) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index)
    }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Experiment name is required");
      return;
    }

    if (form.variants.length < 2) {
      setFormError("At least two variants are required");
      return;
    }

    for (const v of form.variants) {
      if (!v.name.trim() || !v.model.trim()) {
        setFormError("All variants must have a name and model");
        return;
      }
    }

    const samples = Number(form.minimumSamples);
    if (Number.isNaN(samples) || samples < 1) {
      setFormError("Minimum samples must be a positive number");
      return;
    }

    try {
      await createMutation.mutateAsync({
        description: form.description.trim() || undefined,
        minimumSamples: samples,
        name: form.name.trim(),
        primaryMetric: form.primaryMetric,
        variants: form.variants.map((v) => ({
          model: v.model.trim(),
          name: v.name.trim(),
          weight: Number(v.weight)
        }))
      });
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal onClose={handleClose} open={open} size="lg" title="New Experiment">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="exp-name"
          label="Name"
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g. GPT-4o vs Claude comparison"
          value={form.name}
        />

        <Input
          id="exp-description"
          label="Description"
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Optional description"
          value={form.description}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="primary-metric">
              Primary Metric
            </label>
            <Select
              id="primary-metric"
              onChange={(v) => updateField("primaryMetric", v)}
              options={METRIC_OPTIONS}
              value={form.primaryMetric}
            />
          </div>
          <Input
            id="minimum-samples"
            label="Minimum Samples"
            min="1"
            onChange={(e) => updateField("minimumSamples", e.target.value)}
            type="number"
            value={form.minimumSamples}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Variants</label>
            <Button
              onClick={addVariant}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Plus className="size-3.5" />
              Add Variant
            </Button>
          </div>
          <div className="space-y-2">
            {form.variants.map((variant, idx) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-border p-3"
                key={idx}
              >
                <Input
                  className="flex-1"
                  onChange={(e) => updateVariant(idx, "name", e.target.value)}
                  placeholder="Variant name"
                  value={variant.name}
                />
                <Input
                  className="flex-1"
                  onChange={(e) => updateVariant(idx, "model", e.target.value)}
                  placeholder="Model (e.g. gpt-4o)"
                  value={variant.model}
                />
                <Input
                  className="w-20"
                  min="0"
                  onChange={(e) => updateVariant(idx, "weight", e.target.value)}
                  placeholder="Weight"
                  type="number"
                  value={variant.weight}
                />
                {form.variants.length > 2 && (
                  <Button
                    className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeVariant(idx)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <TextMorph>
              {isSubmitting ? "Creating..." : "Create Experiment"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
