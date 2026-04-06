"use client";

import type { Column } from "@raven/ui";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  PageHeader
} from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CollectionForm } from "./[id]/components/collection-form";
import {
  type Collection,
  collectionsQueryOptions,
  useDeleteCollection
} from "./hooks/use-collections";

const KnowledgePage = () => {
  const {
    data: collections = [],
    isLoading,
    error
  } = useQuery(collectionsQueryOptions());

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteCollection();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error is handled by toast.promise in the mutation hook
    }
  };

  const openCreate = () => {
    setEditingCollection(null);
    setModalMode("create");
  };

  const columns: Column<Collection>[] = [
    {
      header: "Name",
      key: "name",
      render: (collection) => (
        <Link
          className="font-medium hover:underline"
          href={`/knowledge/${collection.name}`}
        >
          {collection.name}
        </Link>
      )
    },
    {
      header: "Documents",
      key: "document_count",
      render: (collection) => (
        <span className="text-sm text-muted-foreground">
          {collection.document_count}
        </span>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Create Collection
          </Button>
        }
        description="Manage knowledge collections for RAG-powered AI responses."
        title="Knowledge"
      />

      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </div>
      )}

      {!isLoading && collections.length === 0 ? (
        <EmptyState
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Create Collection
            </Button>
          }
          description="Create a knowledge collection to enable RAG for your AI requests."
          icon={<BookOpen className="size-8" />}
          title="No collections yet"
        />
      ) : (
        <DataTable
          columns={columns}
          data={collections}
          keyExtractor={(c) => c.id}
          loading={isLoading}
          loadingMessage="Loading collections..."
        />
      )}

      <CollectionForm
        editingCollection={editingCollection}
        key={editingCollection?.id ?? modalMode}
        mode={modalMode}
        onClose={() => {
          setModalMode(null);
          setEditingCollection(null);
        }}
      />

      <ConfirmDialog
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        description="Are you sure you want to delete this collection? All documents and chunks will be permanently removed. This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Collection"
      />
    </div>
  );
};

export default KnowledgePage;
