import type { S3Job } from "../../hooks/use-s3-jobs";

const STATUS_DOT: Record<S3Job["status"], string> = {
  complete: "bg-emerald-500",
  failed: "bg-red-500",
  ingesting: "bg-blue-500 animate-pulse",
  listing: "bg-amber-500 animate-pulse",
  pending: "bg-zinc-400"
};

const STATUS_LABEL: Record<S3Job["status"], string> = {
  complete: "Complete",
  failed: "Failed",
  ingesting: "Ingesting",
  listing: "Listing files...",
  pending: "Pending"
};

const getStatusLabel = (job: S3Job): string => {
  if (job.status === "listing" && job.total_found > 0) {
    return `Listing \u2014 ${job.total_found.toLocaleString()} files found`;
  }
  return STATUS_LABEL[job.status];
};

interface S3JobCellProps {
  readonly job: S3Job;
}

const StatusCell = ({ job }: S3JobCellProps) => (
  <div className="flex flex-col gap-1">
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
      <span className={`size-1.5 rounded-full ${STATUS_DOT[job.status]}`} />
      {getStatusLabel(job)}
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

const getProgressBarColor = (status: S3Job["status"]): string => {
  switch (status) {
    case "failed":
      return "bg-red-500";
    case "complete":
      return "bg-emerald-500";
    default:
      return "bg-blue-500";
  }
};

const ProgressCell = ({ job }: S3JobCellProps) => {
  if (job.status === "pending" || job.status === "listing") {
    return <span className="text-xs text-muted-foreground">Waiting...</span>;
  }

  if (job.status === "complete" && job.total_found === 0) {
    return (
      <span className="text-xs text-muted-foreground">No files found</span>
    );
  }

  if (job.total_found === 0) {
    return <span className="text-xs text-muted-foreground">&mdash;</span>;
  }

  const done = job.total_ingested + job.total_skipped;
  const pct = Math.round((done / job.total_found) * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${getProgressBarColor(job.status)}`}
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
            ` \u00b7 ${job.total_skipped.toLocaleString()} skipped`}
        </span>
      )}
    </div>
  );
};

export { ProgressCell, StatusCell };
