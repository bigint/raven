"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  Cpu,
  Database,
  HardDrive,
  Hash,
  ScanSearch
} from "lucide-react";
import type { Collection } from "../../hooks/use-collections";
import { collectionStatsQueryOptions } from "../../hooks/use-collections";

interface CollectionStatsProps {
  readonly collection: Collection;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatNumber = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n);

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: string | number;
  readonly sub?: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const ConfigRow = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

const CollectionStats = ({ collection }: CollectionStatsProps) => {
  const { data: stats } = useQuery(
    collectionStatsQueryOptions(collection.name)
  );

  const statusSub = stats
    ? `${stats.status_counts.ready} ready, ${stats.status_counts.pending + stats.status_counts.processing} processing, ${stats.status_counts.failed} failed`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Documents"
          sub={statusSub}
          value={collection.document_count}
        />
        <StatCard
          icon={Hash}
          label="Chunks"
          value={stats ? formatNumber(stats.total_chunks) : "-"}
        />
        <StatCard
          icon={Database}
          label="Tokens"
          value={stats ? formatNumber(stats.total_tokens) : "-"}
        />
        <StatCard
          icon={HardDrive}
          label="Size"
          value={stats ? formatBytes(stats.total_size_bytes) : "-"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Cpu className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Embedding</h3>
          </div>
          <div className="divide-y divide-border px-4">
            <ConfigRow label="Provider" value={collection.embedding_provider} />
            <ConfigRow label="Model" value={collection.embedding_model} />
            <ConfigRow label="Dimension" value={collection.dimension} />
            <ConfigRow label="Chunk Size" value={collection.chunk_size} />
            <ConfigRow label="Chunk Overlap" value={collection.chunk_overlap} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ScanSearch className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Search Defaults</h3>
          </div>
          <div className="divide-y divide-border px-4">
            <ConfigRow label="Top K" value={collection.default_top_k} />
            <ConfigRow
              label="Min Score"
              value={
                collection.default_min_score === null ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  collection.default_min_score
                )
              }
            />
            <ConfigRow
              label="Search Mode"
              value={collection.default_search_mode}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Created{" "}
          {formatDistanceToNow(new Date(collection.created_at), {
            addSuffix: true
          })}
        </span>
        <span>
          Updated{" "}
          {formatDistanceToNow(new Date(collection.updated_at), {
            addSuffix: true
          })}
        </span>
      </div>
    </div>
  );
};

export { CollectionStats };
