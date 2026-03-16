"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ExperimentForm } from "./components/experiment-form";
import { ExperimentList } from "./components/experiment-list";
import {
  experimentsQueryOptions,
  useDeleteExperiment,
  useUpdateExperiment
} from "./hooks/use-experiments";

const ExperimentsPage = () => {
  const {
    data: experiments = [],
    isLoading,
    error
  } = useQuery(experimentsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteExperiment();
  const updateMutation = useUpdateExperiment();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateMutation.mutateAsync({ id, status });
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New Experiment
          </Button>
        }
        description="Run A/B tests across models to optimize cost, latency, and quality."
        title="Experiments"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <ExperimentList
        experiments={experiments}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onStatusChange={handleStatusChange}
      />

      <ExperimentForm
        key={formOpen ? "open" : "closed"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this experiment? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Experiment"
      />
    </div>
  );
};

export default ExperimentsPage;
