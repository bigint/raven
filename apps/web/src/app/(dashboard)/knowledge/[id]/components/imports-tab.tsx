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
import { ProgressCell, StatusCell } from "./s3-job-cells";

const isTerminal = (status: S3Job["status"]): boolean =>
  status === "complete" || status === "failed";

const buildColumns = (
  onResync: (id: string) => void,
  isResyncing: boolean,
  onDelete: (job: S3Job) => void
): Column<S3Job>[] => [
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
        {isTerminal(job.status) && (
          <Button
            disabled={isResyncing}
            onClick={() => onResync(job.id)}
            size="sm"
            title="Re-sync \u2014 fetch new files from this bucket"
            variant="ghost"
          >
            <RefreshCw className="size-3.5 text-muted-foreground" />
          </Button>
        )}
        <Button onClick={() => onDelete(job)} size="sm" variant="ghost">
          <Trash2 className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
    )
  }
];

const formatDeleteDescription = (job: S3Job | null): string => {
  if (!job) return "";
  const path = job.prefix ? `/${job.prefix}` : "";
  return `Delete the import from s3://${job.bucket}${path}? This removes the import record only \u2014 already ingested documents are not affected.`;
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

  const columns = buildColumns(
    (id) => resyncMutation.mutate(id),
    resyncMutation.isPending,
    setDeleteTarget
  );

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
        description={formatDeleteDescription(deleteTarget)}
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
