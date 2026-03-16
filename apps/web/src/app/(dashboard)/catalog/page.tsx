"use client";

import { Button, ConfirmDialog, PageHeader, PillTabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { CatalogForm } from "./components/catalog-form";
import { CatalogList } from "./components/catalog-list";
import {
  type CatalogItem,
  catalogQueryOptions,
  useDeleteCatalogItem,
  useUpdateCatalogItem
} from "./hooks/use-catalog";

type CatalogFilter =
  | "all"
  | "model"
  | "agent"
  | "mcp_server"
  | "prompt_template"
  | "guardrail_policy";

const TAB_OPTIONS = [
  { label: "All", value: "all" as CatalogFilter },
  { label: "Models", value: "model" as CatalogFilter },
  { label: "Agents", value: "agent" as CatalogFilter },
  { label: "MCP Servers", value: "mcp_server" as CatalogFilter },
  { label: "Templates", value: "prompt_template" as CatalogFilter },
  { label: "Policies", value: "guardrail_policy" as CatalogFilter }
];

const CatalogPage = () => {
  const {
    data: items = [],
    error,
    isLoading
  } = useQuery(catalogQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CatalogFilter>("all");

  const updateMutation = useUpdateCatalogItem();
  const deleteMutation = useDeleteCatalogItem();

  const filteredItems = useMemo(
    () => items.filter((item) => filter === "all" || item.type === filter),
    [items, filter]
  );

  const handleApprove = (item: CatalogItem) => {
    updateMutation.mutate({ id: item.id, status: "approved" });
  };

  const handleReject = (item: CatalogItem) => {
    updateMutation.mutate({ id: item.id, status: "rejected" });
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
            Add Item
          </Button>
        }
        description="Browse and manage approved AI resources across the platform."
        title="AI Catalog"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <div className="mb-4">
        <PillTabs onChange={setFilter} options={TAB_OPTIONS} value={filter} />
      </div>

      <CatalogList
        items={filteredItems}
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onApprove={handleApprove}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(item) => setEditingItem(item)}
        onReject={handleReject}
      />

      <CatalogForm
        editingItem={editingItem}
        key={editingItem?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        open={formOpen || !!editingItem}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this catalog item? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Catalog Item"
      />
    </div>
  );
};

export default CatalogPage;
