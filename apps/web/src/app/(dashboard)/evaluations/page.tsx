"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { EvaluationForm } from "./components/evaluation-form";
import { EvaluationList } from "./components/evaluation-list";
import { EvaluationResultsModal } from "./components/evaluation-results-modal";
import { EvaluationRunModal } from "./components/evaluation-run-modal";
import {
  type Evaluation,
  evaluationsQueryOptions,
  useDeleteEvaluation
} from "./hooks/use-evaluations";

const EvaluationsPage = () => {
  const {
    data: evaluations = [],
    isLoading,
    error
  } = useQuery(evaluationsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [runEval, setRunEval] = useState<Evaluation | null>(null);
  const [viewEval, setViewEval] = useState<Evaluation | null>(null);
  const deleteMutation = useDeleteEvaluation();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Create Evaluation
          </Button>
        }
        description="Run and manage evaluations to measure model quality."
        title="Evaluations"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <EvaluationList
        evaluations={evaluations}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onRun={(e) => setRunEval(e)}
        onView={(e) => setViewEval(e)}
      />

      <EvaluationForm
        key={formOpen ? "open" : "closed"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />

      <EvaluationRunModal
        evaluation={runEval}
        onClose={() => setRunEval(null)}
        open={runEval !== null}
      />

      <EvaluationResultsModal
        evaluation={viewEval}
        onClose={() => setViewEval(null)}
        open={viewEval !== null}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this evaluation? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Evaluation"
      />
    </div>
  );
};

export default EvaluationsPage;
