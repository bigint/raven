"use client";

import { Button, ConfirmDialog, Modal, PageHeader, Select } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ConversationDetail } from "./components/conversation-detail";
import { ConversationList } from "./components/conversation-list";
import {
  type Conversation,
  conversationsQueryOptions,
  useCompactConversation,
  useCreateConversation,
  useDeleteConversation
} from "./hooks/use-conversations";

const COMPACT_STRATEGIES = [
  { label: "Summarize", value: "summarize" },
  { label: "Truncate", value: "truncate" },
  { label: "Rolling Window", value: "rolling_window" }
];

const ConversationsPage = () => {
  const {
    data: conversations = [],
    isLoading,
    error
  } = useQuery(conversationsQueryOptions());

  const [viewingConversation, setViewingConversation] =
    useState<Conversation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compactingConversation, setCompactingConversation] =
    useState<Conversation | null>(null);
  const [compactStrategy, setCompactStrategy] = useState("summarize");

  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();
  const compactMutation = useCompactConversation();

  const handleCreate = async () => {
    await createMutation.mutateAsync({});
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleCompact = async (e: FormEvent) => {
    e.preventDefault();
    if (!compactingConversation) return;
    await compactMutation.mutateAsync({
      id: compactingConversation.id,
      strategy: compactStrategy
    });
    setCompactingConversation(null);
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button disabled={createMutation.isPending} onClick={handleCreate}>
            <Plus className="size-4" />
            {createMutation.isPending ? "Creating..." : "New Conversation"}
          </Button>
        }
        description="View and manage your AI conversations."
        title="Conversations"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <ConversationList
        conversations={conversations}
        loading={isLoading}
        onAdd={handleCreate}
        onCompact={(c) => setCompactingConversation(c)}
        onDelete={(id) => setDeleteId(id)}
        onView={(c) => setViewingConversation(c)}
      />

      {viewingConversation && (
        <ConversationDetail
          conversation={viewingConversation}
          onClose={() => setViewingConversation(null)}
          open={!!viewingConversation}
        />
      )}

      <Modal
        onClose={() => setCompactingConversation(null)}
        open={!!compactingConversation}
        title="Compact Conversation"
      >
        <form className="space-y-4" onSubmit={handleCompact}>
          <p className="text-sm text-muted-foreground">
            Compacting reduces token usage by condensing the conversation
            history.
          </p>
          <Select
            id="compact-strategy"
            label="Strategy"
            onChange={setCompactStrategy}
            options={COMPACT_STRATEGIES}
            value={compactStrategy}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={() => setCompactingConversation(null)}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={compactMutation.isPending} type="submit">
              {compactMutation.isPending ? "Compacting..." : "Compact"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Conversation"
      />
    </div>
  );
};

export default ConversationsPage;
