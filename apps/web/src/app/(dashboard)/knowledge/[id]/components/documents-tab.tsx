"use client";

import type { Column } from "@raven/ui";
import { Button, Checkbox, ConfirmDialog, DataTable } from "@raven/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileUp, Globe, ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Document } from "../../hooks/use-documents";
import {
  batchStatusQueryOptions,
  documentsQueryOptions,
  useBatchDeleteDocuments,
  useDeleteDocument
} from "../../hooks/use-documents";
import { UploadModal } from "./upload-modal";

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  csv: <FileUp className="size-3.5" />,
  docx: <FileUp className="size-3.5" />,
  html: <Globe className="size-3.5" />,
  json: <FileUp className="size-3.5" />,
  md: <FileUp className="size-3.5" />,
  pdf: <FileUp className="size-3.5" />,
  png: <ImageIcon className="size-3.5" />,
  txt: <FileUp className="size-3.5" />,
  xml: <FileUp className="size-3.5" />
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
    {doc.status === "processing" && doc.chunk_count > 0 && (
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {doc.chunk_count} chunks
      </span>
    )}
    {doc.status === "failed" && doc.error_message && (
      <span
        className="max-w-[200px] truncate text-[11px] text-destructive"
        title={doc.error_message}
      >
        {doc.error_message}
      </span>
    )}
  </div>
);

interface DocumentsTabProps {
  readonly collectionId: string;
}

const DocumentsTab = ({ collectionId }: DocumentsTabProps) => {
  const queryClient = useQueryClient();
  const { data: documents = [], isLoading } = useQuery(
    documentsQueryOptions(collectionId)
  );

  const pendingIds = documents
    .filter((d) => d.status === "pending" || d.status === "processing")
    .map((d) => d.id);

  useQuery({
    ...batchStatusQueryOptions(collectionId, pendingIds),
    enabled: pendingIds.length > 0,
    refetchInterval: 2000,
    select: (data) => {
      const statuses = data.statuses;
      if (statuses.length === 0) return data;

      const allDone = statuses.every(
        (s) => s.status !== "pending" && s.status !== "processing"
      );

      if (allDone) {
        queryClient.invalidateQueries({
          queryKey: ["knowledge-documents", collectionId]
        });
      } else {
        const statusMap = new Map(statuses.map((s) => [s.id, s]));
        queryClient.setQueryData<Document[]>(
          ["knowledge-documents", collectionId],
          (old) =>
            old?.map((doc) => {
              const update = statusMap.get(doc.id);
              if (!update) return doc;
              return {
                ...doc,
                chunk_count: update.chunk_count,
                error_message: update.error_message,
                status: update.status
              };
            })
        );
      }
      return data;
    }
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const deleteMutation = useDeleteDocument(collectionId);
  const batchDeleteMutation = useBatchDeleteDocuments(collectionId);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error is handled by toast.promise in the mutation hook
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    try {
      await batchDeleteMutation.mutateAsync(Array.from(selected));
      setSelected(new Set());
      setBatchDeleteOpen(false);
    } catch {
      // Error is handled by toast in the mutation hook
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  };

  const allSelected =
    documents.length > 0 && selected.size === documents.length;
  const someSelected = selected.size > 0 && selected.size < documents.length;

  const columns: Column<Document>[] = [
    {
      className: "w-10",
      header: "",
      headerClassName: "w-10",
      key: "select",
      render: (doc) => (
        <Checkbox
          aria-label={`Select ${doc.filename}`}
          checked={selected.has(doc.id)}
          onCheckedChange={() => toggleSelect(doc.id)}
        />
      )
    },
    {
      header: "Filename",
      key: "filename",
      render: (doc) => (
        <Link
          className="font-medium hover:underline"
          href={`/knowledge/${collectionId}/documents/${doc.id}`}
        >
          {doc.filename}
        </Link>
      )
    },
    {
      header: "Type",
      key: "file_type",
      render: (doc) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {FILE_TYPE_ICONS[doc.file_type] ?? <FileUp className="size-3.5" />}
          {doc.file_type}
        </span>
      )
    },
    {
      header: "Chunks",
      key: "chunk_count",
      render: (doc) => (
        <span className="text-sm text-muted-foreground">{doc.chunk_count}</span>
      )
    },
    {
      header: "Status",
      key: "status",
      render: (doc) => <StatusCell doc={doc} />
    },
    {
      header: "Added",
      key: "created_at",
      render: (doc) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <Checkbox
              aria-label="Select all documents"
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={toggleSelectAll}
            />
          )}
          {selected.size > 0 && (
            <Button
              onClick={() => setBatchDeleteOpen(true)}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="size-3.5" />
              Delete {selected.size} selected
            </Button>
          )}
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <FileUp className="size-4" />
          Upload Files
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

      <ConfirmDialog
        confirmLabel={
          batchDeleteMutation.isPending
            ? "Deleting..."
            : `Delete ${selected.size} documents`
        }
        description={`Are you sure you want to delete ${selected.size} document${selected.size > 1 ? "s" : ""}? All associated chunks will be permanently removed. This action cannot be undone.`}
        loading={batchDeleteMutation.isPending}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={handleBatchDelete}
        open={batchDeleteOpen}
        title="Delete Documents"
      />
    </div>
  );
};

export { DocumentsTab };
