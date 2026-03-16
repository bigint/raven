"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { McpForm } from "./components/mcp-form";
import { McpList } from "./components/mcp-list";
import {
  type McpServer,
  mcpServersQueryOptions,
  useDeleteMcpServer,
  useUpdateMcpServer
} from "./hooks/use-mcp";

const McpPage = () => {
  const {
    data: servers = [],
    error,
    isLoading
  } = useQuery(mcpServersQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateMutation = useUpdateMcpServer();
  const deleteMutation = useDeleteMcpServer();

  const handleToggleEnabled = (server: McpServer) => {
    updateMutation.mutate({ id: server.id, isEnabled: !server.isEnabled });
  };

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
            Add Server
          </Button>
        }
        description="Manage MCP server connections and configurations."
        title="MCP Servers"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <McpList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(s) => setEditingServer(s)}
        onToggleEnabled={handleToggleEnabled}
        servers={servers}
      />

      <McpForm
        editingServer={editingServer}
        key={editingServer?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingServer(null);
        }}
        open={formOpen || !!editingServer}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this MCP server? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete MCP Server"
      />
    </div>
  );
};

export default McpPage;
