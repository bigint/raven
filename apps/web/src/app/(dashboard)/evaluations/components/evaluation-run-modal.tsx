"use client";

import { Button, Modal, Textarea } from "@raven/ui";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { Evaluation } from "../hooks/use-evaluations";
import { useRunEvaluation } from "../hooks/use-evaluations";

interface Sample {
  prompt: string;
  response: string;
}

interface EvaluationRunModalProps {
  evaluation: Evaluation | null;
  open: boolean;
  onClose: () => void;
}

const EvaluationRunModal = ({
  evaluation,
  open,
  onClose
}: EvaluationRunModalProps) => {
  const [samples, setSamples] = useState<Sample[]>([
    { prompt: "", response: "" }
  ]);
  const [error, setError] = useState<string | null>(null);
  const runMutation = useRunEvaluation();

  const addSample = () =>
    setSamples((s) => [...s, { prompt: "", response: "" }]);

  const removeSample = (idx: number) =>
    setSamples((s) => s.filter((_, i) => i !== idx));

  const updateSample = (idx: number, field: keyof Sample, value: string) =>
    setSamples((s) =>
      s.map((sample, i) => (i === idx ? { ...sample, [field]: value } : sample))
    );

  const handleClose = () => {
    setSamples([{ prompt: "", response: "" }]);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validSamples = samples.filter(
      (s) => s.prompt.trim() && s.response.trim()
    );
    if (validSamples.length === 0) {
      setError("Add at least one sample with both prompt and response");
      return;
    }

    if (!evaluation) return;

    try {
      await runMutation.mutateAsync({
        id: evaluation.id,
        samples: validSamples
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={`Run: ${evaluation?.name ?? "Evaluation"}`}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Add prompt/response pairs to evaluate with the{" "}
          <span className="font-medium text-foreground">
            {evaluation?.evaluatorType}
          </span>{" "}
          evaluator.
        </p>

        {samples.map((sample, idx) => (
          <div
            className="space-y-2 rounded-md border border-border p-3"
            key={idx}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Sample {idx + 1}
              </span>
              {samples.length > 1 && (
                <Button
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeSample(idx)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            <Textarea
              onChange={(e) => updateSample(idx, "prompt", e.target.value)}
              placeholder="Enter the prompt..."
              rows={2}
              value={sample.prompt}
            />
            <Textarea
              onChange={(e) => updateSample(idx, "response", e.target.value)}
              placeholder="Enter the model response..."
              rows={2}
              value={sample.response}
            />
          </div>
        ))}

        <Button
          className="w-full"
          onClick={addSample}
          type="button"
          variant="secondary"
        >
          <Plus className="size-4" />
          Add Sample
        </Button>

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={runMutation.isPending} type="submit">
            <TextMorph>
              {runMutation.isPending ? "Running..." : "Run Evaluation"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { EvaluationRunModal };
