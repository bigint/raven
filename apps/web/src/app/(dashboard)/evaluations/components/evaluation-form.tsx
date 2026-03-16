"use client";

import { Button, Input, Modal, Select, Textarea } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import { useCreateEvaluation } from "../hooks/use-evaluations";

const EVALUATOR_TYPES = [
  { label: "Relevance", value: "relevance" },
  { label: "Coherence", value: "coherence" },
  { label: "PII Leakage", value: "pii_leakage" },
  { label: "Toxicity", value: "toxicity" },
  { label: "All", value: "all" }
];

interface FormState {
  name: string;
  description: string;
  model: string;
  evaluatorType: string;
}

const DEFAULT_FORM: FormState = {
  description: "",
  evaluatorType: "relevance",
  model: "",
  name: ""
};

interface EvaluationFormProps {
  open: boolean;
  onClose: () => void;
}

const EvaluationForm = ({ open, onClose }: EvaluationFormProps) => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateEvaluation();
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

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!form.model.trim()) {
      setFormError("Model is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        description: form.description.trim() || undefined,
        evaluatorType: form.evaluatorType,
        model: form.model.trim(),
        name: form.name.trim()
      });
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal onClose={handleClose} open={open} title="Create Evaluation">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="eval-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. GPT-4o Relevance Check"
          value={form.name}
        />

        <Textarea
          id="eval-description"
          label="Description (optional)"
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe what this evaluation tests..."
          rows={3}
          value={form.description}
        />

        <Input
          id="eval-model"
          label="Model"
          onChange={(e) => update("model", e.target.value)}
          placeholder="e.g. gpt-4o"
          value={form.model}
        />

        <Select
          id="eval-evaluator-type"
          label="Evaluator Type"
          onChange={(v) => update("evaluatorType", v)}
          options={EVALUATOR_TYPES}
          value={form.evaluatorType}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <TextMorph>
              {isSubmitting ? "Creating..." : "Create Evaluation"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { EvaluationForm };
