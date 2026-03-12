"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { RoutingRuleForm } from "./components/routing-rule-form";
import { RoutingRuleList } from "./components/routing-rule-list";
import {
  type RoutingRule,
  routingRulesQueryOptions,
  useDeleteRoutingRule
} from "./hooks/use-routing-rules";

const RoutingPage = () => {
  const {
    data: rules = [],
    isLoading,
    error,
    refetch
  } = useQuery(routingRulesQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteRoutingRule();

  useEventStream({
    enabled: !isLoading,
    events: [
      "routing-rule.created",
      "routing-rule.updated",
      "routing-rule.deleted"
    ],
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
            Add Rule
          </Button>
        }
        description="Route requests to different models based on conditions."
        title="Routing Rules"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <RoutingRuleList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(r) => setEditingRule(r)}
        rules={rules}
      />

      <RoutingRuleForm
        editingRule={editingRule}
        onClose={() => {
          setFormOpen(false);
          setEditingRule(null);
        }}
        open={formOpen || !!editingRule}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this routing rule? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Routing Rule"
      />
    </div>
  );
};

export default RoutingPage;
