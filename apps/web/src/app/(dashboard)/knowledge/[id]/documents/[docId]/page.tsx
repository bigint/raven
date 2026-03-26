"use client";

import { Button, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  ImageIcon,
  RefreshCw
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  documentChunksQueryOptions,
  documentDetailQueryOptions,
  useReprocessDocument
} from "../../../hooks/use-documents";

const SOURCE_ICONS = {
  file: FileText,
  image: ImageIcon,
  url: Globe
};

const STATUS_DOT: Record<string, string> = {
  failed: "bg-red-500",
  pending: "bg-zinc-400",
  processing: "bg-amber-500",
  ready: "bg-emerald-500"
};

const STATUS_LABEL: Record<string, string> = {
  failed: "Failed",
  pending: "Queued",
  processing: "Processing",
  ready: "Ready"
};

const PAGE_SIZE = 20;

const DocumentDetailPage = () => {
  const router = useRouter();
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const [page, setPage] = useState(0);

  const {
    data: doc,
    isPending,
    isError,
    error
  } = useQuery({
    ...documentDetailQueryOptions(docId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2000 : false;
    }
  });

  const { data: chunksData } = useQuery({
    ...documentChunksQueryOptions(docId, PAGE_SIZE, page * PAGE_SIZE),
    enabled: !!doc && doc.status === "ready"
  });

  const reprocess = useReprocessDocument();

  const pageChunks = chunksData?.chunks ?? [];
  const totalChunks = chunksData?.total ?? 0;
  const totalPages = Math.ceil(totalChunks / PAGE_SIZE);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div
        className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {error?.message ?? "Document not found"}
      </div>
    );
  }

  const SourceIcon = SOURCE_ICONS[doc.sourceType] ?? FileText;
  const avgTokens =
    doc.chunkCount > 0 ? Math.round(doc.tokenCount / doc.chunkCount) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.push(`/knowledge/${id}`)}
          type="button"
        >
          <ArrowLeft className="size-3.5" />
          Back to collection
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <SourceIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {doc.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-medium">
                  <span
                    className={`size-1.5 rounded-full ${STATUS_DOT[doc.status] ?? ""} ${doc.status === "processing" ? "animate-pulse" : ""}`}
                  />
                  {STATUS_LABEL[doc.status] ?? doc.status}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {format(new Date(doc.createdAt), "MMM d, yyyy")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDistanceToNow(new Date(doc.createdAt), {
                    addSuffix: true
                  })}
                </span>
              </div>
            </div>
          </div>

          <Button
            disabled={reprocess.isPending}
            onClick={() => reprocess.mutate(doc.id)}
            variant="secondary"
          >
            <RefreshCw
              className={`size-4 ${reprocess.isPending ? "animate-spin" : ""}`}
            />
            {reprocess.isPending ? "Reprocessing..." : "Reprocess"}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {doc.errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {doc.errorMessage}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Hash className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Chunks</p>
            <p className="text-lg font-semibold tabular-nums">
              {doc.chunkCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <FileText className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Tokens</p>
            <p className="text-lg font-semibold tabular-nums">
              {doc.tokenCount.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Hash className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Avg per chunk</p>
            <p className="text-lg font-semibold tabular-nums">
              {avgTokens} tokens
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <FileText className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">File size</p>
            <p className="text-lg font-semibold tabular-nums">
              {doc.fileSize
                ? `${(doc.fileSize / 1024).toFixed(1)} KB`
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Source URL */}
      {doc.sourceUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <a
            className="min-w-0 truncate text-sm text-primary hover:underline"
            href={doc.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {doc.sourceUrl}
          </a>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
        </div>
      )}

      {/* Chunks section */}
      {doc.status === "ready" && totalChunks > 0 && (
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              Chunks
              <span className="ml-1.5 font-normal text-muted-foreground">
                {totalChunks}
              </span>
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalChunks)}
            </span>
          </div>

          {/* Chunk list */}
          <div className="divide-y divide-border">
            {pageChunks.map((chunk) => (
              <div className="px-4 py-3" key={chunk.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      #{chunk.chunkIndex}
                    </span>
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {chunk.tokenCount} tokens
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {chunk.content
                    .replace(/\n{3,}/g, "\n\n")
                    .replace(/[ \t]+/g, " ")
                    .trim()}
                </p>
              </div>
            ))}

            {pageChunks.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No chunks match your search.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <Button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                size="sm"
                variant="ghost"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="ghost"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentDetailPage;
