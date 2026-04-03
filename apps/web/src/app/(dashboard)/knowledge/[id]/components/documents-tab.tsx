"use client";

import type { Column } from "@raven/ui";
import { Button, ConfirmDialog, DataTable } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileUp, Globe, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Document } from "../../hooks/use-documents";
import {
  documentsQueryOptions,
  useDeleteDocument
} from "../../hooks/use-documents";
import { UploadModal } from "./upload-modal";

const SOURCE_TYPE_ICONS: Record<Document["sourceType"], React.ReactNode> = {
  file: <FileUp className="size-3.5" />,
  image: <ImageIcon className="size-3.5" />,
  url: <Globe className="size-3.5" />
};

const STATUS_DOT: Record<Document["status"], string> = {
  failed: "bg-red-500",
  pending: "bg-zinc-400",
  processing: "bg-amber-500",
  ready: "bg-emerald-500"
};

const STATUS_LABEL: Record<Document["status"], string> = {
  failed: "Failed",
  pending: "Queued",
  processing: "Processing",
  ready: "Ready"
};

const StatusCell = ({ doc }: { readonly doc: Document }) => (
  <div className="flex flex-col gap-1">
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
      <span
        className={`size-1.5 rounded-full ${STATUS_DOT[doc.status]} ${doc.status === "processing" ? "animate-pulse" : ""}`}
      />
      {STATUS_LABEL[doc.status]}
    </span>
    {doc.status === "processing" && doc.chunkCount > 0 && (
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {doc.chunkCount} chunks
      </span>
    )}
    {doc.status === "failed" && doc.errorMessage && (
      <span
        className="max-w-[200px] truncate text-[11px] text-destructive"
        title={doc.errorMessage}
      >
        {doc.errorMessage}
      </span>
    )}
  </div>
);

interface DocumentsTabProps {
  readonly collectionId: string;
}

const hasPending = (docs: Document[]) =>
  docs.some((d) => d.status === "pending" || d.status === "processing");

const DocumentsTab = ({ collectionId }: DocumentsTabProps) => {
  const { data: documents = [], isLoading } = useQuery({
    ...documentsQueryOptions(collectionId),
    refetchInterval: (query) =>
      hasPending(query.state.data ?? []) ? 2000 : false
  });

  const [uploadOpen, setUploadOpen] = useState(false);
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
      header: "Status",
      key: "status",
      render: (doc) => <StatusCell doc={doc} />
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
        <Button onClick={() => setDeleteId(doc.id)} size="sm" variant="ghost">
          Delete
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
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
