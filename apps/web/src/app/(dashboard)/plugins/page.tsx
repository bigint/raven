"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PluginForm } from "./components/plugin-form";
import { PluginList } from "./components/plugin-list";
import {
  type Plugin,
  pluginsQueryOptions,
  useDeletePlugin,
  useUpdatePlugin
} from "./hooks/use-plugins";

const PluginsPage = () => {
  const {
    data: plugins = [],
    isLoading,
    error
  } = useQuery(pluginsQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeletePlugin();
  const updateMutation = useUpdatePlugin();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleToggle = async (plugin: Plugin) => {
    await updateMutation.mutateAsync({
      id: plugin.id,
      isEnabled: !plugin.isEnabled
    });
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Create Plugin
          </Button>
        }
        description="Extend gateway functionality with plugins."
        title="Plugins"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <PluginList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(p) => setEditingPlugin(p)}
        onToggle={handleToggle}
        plugins={plugins}
      />

      <PluginForm
        editingPlugin={editingPlugin}
        key={editingPlugin?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingPlugin(null);
        }}
        open={formOpen || !!editingPlugin}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this plugin? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Plugin"
      />
    </div>
  );
};

export default PluginsPage;
