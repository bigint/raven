"use client";

import type { Column } from "@raven/ui";
import { Button, ConfirmDialog, DataTable } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { S3Job } from "../../hooks/use-s3-jobs";
import {
  s3JobsQueryOptions,
  useDeleteS3Job,
  useResyncS3Job
} from "../../hooks/use-s3-jobs";

const STATUS_DOT: Record<S3Job["status"], string> = {
  complete: "bg-emerald-500",
  failed: "bg-red-500",
  ingesting: "bg-blue-500 animate-pulse",
  listing: "bg-amber-500 animate-pulse",
  pending: "bg-zinc-400"
};

const StatusCell = ({ job }: { readonly job: S3Job }) => {
  const label = (() => {
    switch (job.status) {
      case "pending":
        return "Pending";
      case "listing":
        return job.total_found > 0
          ? `Listing — ${job.total_found.toLocaleString()} files found`
          : "Listing files...";
      case "ingesting":
        return "Ingesting";
      case "complete":
        return "Complete";
      case "failed":
        return "Failed";
    }
  })();

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
        <span className={`size-1.5 rounded-full ${STATUS_DOT[job.status]}`} />
        {label}
      </span>
      {job.status === "failed" && job.error_message && (
        <span
          className="max-w-[200px] truncate text-[11px] text-destructive"
          title={job.error_message}
        >
          {job.error_message}
        </span>
      )}
    </div>
  );
};

const ProgressCell = ({ job }: { readonly job: S3Job }) => {
  if (job.status === "pending" || job.status === "listing") {
    return <span className="text-xs text-muted-foreground">Waiting...</span>;
  }

  if (job.status === "complete" && job.total_found === 0) {
    return (
      <span className="text-xs text-muted-foreground">No files found</span>
    );
  }

  if (job.total_found === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const done = job.total_ingested + job.total_skipped;
  const pct = Math.round((done / job.total_found) * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              job.status === "failed"
                ? "bg-red-500"
                : job.status === "complete"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
      {job.status !== "complete" && (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {job.total_ingested.toLocaleString()} /{" "}
          {job.total_found.toLocaleString()} files
          {job.total_skipped > 0 &&
            ` · ${job.total_skipped.toLocaleString()} skipped`}
        </span>
      )}
    </div>
  );
};

interface ImportsTabProps {
  readonly collectionId: string;
}

const ImportsTab = ({ collectionId }: ImportsTabProps) => {
  const { data, isLoading } = useQuery(s3JobsQueryOptions(collectionId));
  const jobs = data?.jobs ?? [];
  const deleteMutation = useDeleteS3Job(collectionId);
  const resyncMutation = useResyncS3Job(collectionId);
  const [deleteTarget, setDeleteTarget] = useState<S3Job | null>(null);

  const columns: Column<S3Job>[] = [
    {
      header: "Bucket",
      key: "bucket",
      render: (job) => (
        <span className="text-sm font-medium">
          {job.bucket}
          {job.prefix && (
            <span className="text-muted-foreground">/{job.prefix}</span>
          )}
        </span>
      )
    },
    {
      header: "Status",
      key: "status",
      render: (job) => <StatusCell job={job} />
    },
    {
      header: "Progress",
      key: "progress",
      render: (job) => <ProgressCell job={job} />
    },
    {
      header: "Started",
      key: "created_at",
      render: (job) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
        </span>
      )
    },
    {
      header: "",
      key: "actions",
      render: (job) => (
        <div className="flex items-center gap-1">
          {(job.status === "complete" || job.status === "failed") && (
            <Button
              disabled={resyncMutation.isPending}
              onClick={() => resyncMutation.mutate(job.id)}
              size="sm"
              title="Re-sync — fetch new files from this bucket"
              variant="ghost"
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
            </Button>
          )}
          <Button
            onClick={() => setDeleteTarget(job)}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={jobs}
        emptyTitle="No imports yet"
        keyExtractor={(job) => job.id}
        loading={isLoading}
        loadingMessage="Loading imports..."
      />

      <ConfirmDialog
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        description={`Delete the import from s3://${deleteTarget?.bucket ?? ""}${deleteTarget?.prefix ? `/${deleteTarget.prefix}` : ""}? This removes the import record only — already ingested documents are not affected.`}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMutation.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
        open={!!deleteTarget}
        title="Delete Import"
      />
    </div>
  );
};

export { ImportsTab };
