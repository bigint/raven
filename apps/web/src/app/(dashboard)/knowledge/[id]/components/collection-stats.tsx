"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Hash,
  Key,
  Loader2,
  ScanSearch,
  Shield,
  XCircle
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

const StatusBar = ({
  counts
}: {
  readonly counts: {
    ready: number;
    pending: number;
    processing: number;
    failed: number;
  };
}) => {
  const total =
    counts.ready + counts.pending + counts.processing + counts.failed;
  if (total === 0) return null;

  const segments = [
    { color: "bg-emerald-500", count: counts.ready, label: "Ready" },
    { color: "bg-zinc-400", count: counts.pending, label: "Pending" },
    { color: "bg-amber-500", count: counts.processing, label: "Processing" },
    { color: "bg-red-500", count: counts.failed, label: "Failed" }
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <div
                className={`${seg.color} transition-all`}
                key={seg.label}
                style={{ width: `${(seg.count / total) * 100}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <div className="flex items-center gap-1.5" key={seg.label}>
                <span className={`size-2 rounded-full ${seg.color}`} />
                {seg.label}: {seg.count}
              </div>
            )
        )}
      </div>
    </div>
  );
};

const KeyBadge = ({
  has,
  label
}: {
  readonly has: boolean;
  readonly label: string;
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${has ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-500"}`}
  >
    {has ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
    {label}
  </span>
);

const CollectionStats = ({ collection }: CollectionStatsProps) => {
  const { data: stats } = useQuery(
    collectionStatsQueryOptions(collection.name)
  );

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Documents"
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

      {/* Status bar */}
      {stats && <StatusBar counts={stats.status_counts} />}

      {/* Config grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Embedding config */}
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

        {/* Search defaults */}
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
            <ConfigRow
              label="Reranking"
              value={
                collection.reranking_enabled ? (
                  <span className="text-emerald-600">
                    {collection.reranking_model}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )
              }
            />
          </div>
        </div>

        {/* Security & keys */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Shield className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Keys & Security</h3>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <Key className="size-3.5 text-muted-foreground" />
              <KeyBadge has={collection.has_api_key} label="Embedding Key" />
            </div>
            <div className="flex items-center gap-2">
              <Key className="size-3.5 text-muted-foreground" />
              <KeyBadge
                has={collection.has_reranking_api_key}
                label="Reranking Key"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          Created{" "}
          {formatDistanceToNow(new Date(collection.created_at), {
            addSuffix: true
          })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Loader2 className="size-3" />
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
