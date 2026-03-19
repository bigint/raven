"use client";

import { Button, ConfirmDialog, EmptyState, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Network, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useSetupStatus } from "@/lib/use-setup-status";
import { PromptDetail } from "./components/prompt-detail";
import { PromptForm } from "./components/prompt-form";
import { PromptList } from "./components/prompt-list";
import {
  type Prompt,
  promptsQueryOptions,
  useDeletePrompt
} from "./hooks/use-prompts";

const PromptsPage = () => {
  const { hasProviders } = useSetupStatus();
  const {
    data: prompts = [],
    isLoading,
    error
  } = useQuery(promptsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeletePrompt();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success("Prompt deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div>
      <PageHeader
        actions={
          hasProviders ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Create Prompt
            </Button>
          ) : undefined
        }
        description="Manage reusable prompt templates for your organization."
        title="Prompts"
      />

      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}

      {!hasProviders && !isLoading && prompts.length === 0 ? (
        <EmptyState
          action={
            <Link href="/providers">
              <Button>
                <Network className="size-4" />
                Add Provider
              </Button>
            </Link>
          }
          description="Connect an AI provider to start creating prompt templates."
          icon={<Network className="size-8" />}
          title="Connect a provider first"
        />
      ) : (
        <PromptList
          loading={isLoading}
          onAdd={() => setFormOpen(true)}
          onDelete={(id) => setDeleteId(id)}
          onEdit={(p) => setEditingPrompt(p)}
          onView={(p) => setViewingPrompt(p)}
          prompts={prompts}
        />
      )}

      <PromptForm
        editingPrompt={editingPrompt}
        key={editingPrompt?.id ?? "create"}
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
