"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AgentForm } from "./components/agent-form";
import { AgentList } from "./components/agent-list";
import {
  type Agent,
  agentsQueryOptions,
  useDeleteAgent
} from "./hooks/use-agents";

const AgentsPage = () => {
  const {
    data: agents = [],
    error,
    isLoading
  } = useQuery(agentsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteAgent();

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
            Add Agent
          </Button>
        }
        description="Manage AI agents and their configurations."
        title="Agents"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <AgentList
        agents={agents}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(a) => setEditingAgent(a)}
      />

      <AgentForm
        editingAgent={editingAgent}
        key={editingAgent?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingAgent(null);
        }}
        open={formOpen || !!editingAgent}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this agent? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Agent"
      />
    </div>
  );
};

export default AgentsPage;
