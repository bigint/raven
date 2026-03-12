"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { WebhookForm } from "./components/webhook-form";
import { WebhookList } from "./components/webhook-list";
import {
  useDeleteWebhook,
  type Webhook,
  webhooksQueryOptions
} from "./hooks/use-webhooks";

const WebhooksPage = () => {
  const {
    data: webhooks = [],
    isLoading,
    error,
    refetch
  } = useQuery(webhooksQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteWebhook();

  useEventStream({
    enabled: !isLoading,
    events: ["webhook.created", "webhook.updated", "webhook.deleted"],
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
            Add Webhook
          </Button>
        }
        description="Receive real-time notifications when events happen in your organization."
        title="Webhooks"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <WebhookList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(w) => setEditingWebhook(w)}
        webhooks={webhooks}
      />

      <WebhookForm
        editingWebhook={editingWebhook}
        onClose={() => {
          setFormOpen(false);
          setEditingWebhook(null);
        }}
        open={formOpen || !!editingWebhook}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this webhook? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Webhook"
      />
    </div>
  );
};

export default WebhooksPage;
