"use client";

import { Badge, Button, PageHeader, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import {
  documentDetailQueryOptions,
  useReprocessDocument
} from "../../../hooks/use-documents";
import { ChunkViewer } from "../../components/chunk-viewer";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "neutral"
> = {
  failed: "error",
  pending: "neutral",
  processing: "warning",
  ready: "success"
};

const DocumentDetailPage = () => {
  const { docId } = useParams<{ id: string; docId: string }>();

  const {
    data: document,
    isPending,
    isError,
    error
  } = useQuery(documentDetailQueryOptions(docId));

  const reprocessMutation = useReprocessDocument();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {error.message}
      </div>
    );
  }

  const statusVariant = STATUS_VARIANT[document.status] ?? "neutral";

  return (
    <div>
      <PageHeader
        actions={
          <Button
            disabled={reprocessMutation.isPending}
            onClick={() => reprocessMutation.mutate(document.id)}
            variant="secondary"
          >
            <RefreshCw className="size-4" />
            {reprocessMutation.isPending ? "Reprocessing..." : "Reprocess"}
          </Button>
        }
        description="View document content and chunk details."
        title={document.title}
      />

      {document.errorMessage && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {document.errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Type</p>
          <p className="mt-1 text-sm font-medium capitalize">
            {document.sourceType}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={statusVariant}>{document.status}</Badge>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Chunks</p>
          <p className="mt-1 text-sm font-medium">{document.chunkCount}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Added</p>
          <p className="mt-1 text-sm font-medium">
            {formatDistanceToNow(new Date(document.createdAt), {
              addSuffix: true
            })}
          </p>
        </div>
      </div>

      {document.sourceUrl && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-muted-foreground">Source URL</p>
          <a
            className="break-all text-sm text-blue-500 underline-offset-4 hover:underline"
            href={document.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {document.sourceUrl}
          </a>
        </div>
      )}

      <ChunkViewer chunks={document.chunks} />
    </div>
  );
};

export default DocumentDetailPage;
