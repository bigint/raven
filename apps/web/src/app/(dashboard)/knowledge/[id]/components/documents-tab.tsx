"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, ConfirmDialog, DataTable } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileUp, Globe, ImageIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Document } from "../../hooks/use-documents";
import {
  documentsQueryOptions,
  useDeleteDocument
} from "../../hooks/use-documents";
import { UploadModal } from "./upload-modal";
import { UrlIngestModal } from "./url-ingest-modal";

const SOURCE_TYPE_ICONS: Record<Document["sourceType"], React.ReactNode> = {
  file: <FileUp className="size-3.5" />,
  image: <ImageIcon className="size-3.5" />,
  url: <Globe className="size-3.5" />
};

const STATUS_VARIANT: Record<
  Document["status"],
  "neutral" | "warning" | "success" | "error"
> = {
  failed: "error",
  pending: "neutral",
  processing: "warning",
  ready: "success"
};

interface DocumentsTabProps {
  readonly collectionId: string;
}

const DocumentsTab = ({ collectionId }: DocumentsTabProps) => {
  const { data: documents = [], isLoading } = useQuery(
    documentsQueryOptions(collectionId)
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteDocument(collectionId);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error is handled by toast.promise in the mutation hook
    }
  };

  const columns: Column<Document>[] = [
    {
      header: "Title",
      key: "title",
      render: (doc) => (
        <Link
          className="font-medium hover:underline"
          href={`/knowledge/${collectionId}/documents/${doc.id}`}
        >
          {doc.title}
        </Link>
      )
    },
    {
      header: "Source",
      key: "sourceType",
      render: (doc) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {SOURCE_TYPE_ICONS[doc.sourceType]}
          {doc.sourceType}
        </span>
      )
    },
    {
      header: "Chunks",
      key: "chunkCount",
      render: (doc) => (
        <span className="text-sm text-muted-foreground">{doc.chunkCount}</span>
      )
    },
    {
      header: "Tokens",
      key: "tokenCount",
      render: (doc) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {doc.tokenCount.toLocaleString()}
        </span>
      )
    },
    {
      header: "Status",
      key: "status",
      render: (doc) => (
        <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
      )
    },
    {
      header: "Added",
      key: "createdAt",
      render: (doc) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
        </span>
      )
    },
    {
      header: "",
      key: "actions",
      render: (doc) => (
        <Button
          onClick={() => setDeleteId(doc.id)}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Button onClick={() => setUrlOpen(true)} variant="secondary">
          <Plus className="size-4" />
          Add URL
        </Button>
        <Button onClick={() => setUploadOpen(true)}>
          <FileUp className="size-4" />
          Upload File
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={documents}
        emptyTitle="No documents yet"
        keyExtractor={(doc) => doc.id}
        loading={isLoading}
        loadingMessage="Loading documents..."
      />

      <UploadModal
        collectionId={collectionId}
        onClose={() => setUploadOpen(false)}
        open={uploadOpen}
      />

      <UrlIngestModal
        collectionId={collectionId}
        onClose={() => setUrlOpen(false)}
        open={urlOpen}
      />

      <ConfirmDialog
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        description="Are you sure you want to delete this document? All associated chunks will be permanently removed. This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Document"
      />
    </div>
  );
};

export { DocumentsTab };
