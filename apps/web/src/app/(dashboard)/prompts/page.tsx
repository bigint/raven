"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { PromptDetail } from "./components/prompt-detail";
import { PromptForm } from "./components/prompt-form";
import { PromptList } from "./components/prompt-list";
import {
  type Prompt,
  promptsQueryOptions,
  useDeletePrompt
} from "./hooks/use-prompts";

const PromptsPage = () => {
  const {
    data: prompts = [],
    isLoading,
    error,
    refetch
  } = useQuery(promptsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeletePrompt();

  useEventStream({
    enabled: !isLoading,
    events: ["prompt.created", "prompt.updated", "prompt.deleted"],
    onEvent: () => refetch()
  });

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
            Create Prompt
          </Button>
        }
        description="Manage reusable prompt templates for your organization."
        title="Prompts"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <PromptList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(p) => setEditingPrompt(p)}
        onView={(p) => setViewingPrompt(p)}
        prompts={prompts}
      />

      <PromptForm
        editingPrompt={editingPrompt}
        onClose={() => {
          setFormOpen(false);
          setEditingPrompt(null);
        }}
        open={formOpen || !!editingPrompt}
      />

      {viewingPrompt && (
        <PromptDetail
          onClose={() => setViewingPrompt(null)}
          open={!!viewingPrompt}
          prompt={viewingPrompt}
        />
      )}

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this prompt? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Prompt"
      />
    </div>
  );
};

export default PromptsPage;
