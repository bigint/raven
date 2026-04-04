"use client";

import { Badge } from "@raven/ui";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Boxes, Hash, ScanSearch } from "lucide-react";
import type { CollectionDetail } from "../../hooks/use-collections";

interface CollectionStatsProps {
  readonly collection: CollectionDetail;
}

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
  const avgTokensPerChunk =
    collection.chunkCount > 0
      ? Math.round(collection.totalTokens / collection.chunkCount)
      : 0;

  const avgChunksPerDoc =
    collection.documentCount > 0
      ? Math.round(collection.chunkCount / collection.documentCount)
      : 0;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          icon={BookOpen}
          label="Documents"
          sub={
            collection.documentCount > 0
              ? `~${avgChunksPerDoc} chunks each`
              : undefined
          }
          value={collection.documentCount}
        />
        <StatCard
          icon={Boxes}
          label="Chunks"
          sub={
            avgTokensPerChunk > 0
              ? `~${avgTokensPerChunk} tokens avg`
              : undefined
          }
          value={collection.chunkCount.toLocaleString()}
        />
        <StatCard
          icon={Hash}
          label="Total Tokens"
          sub={
            (collection.totalTokens ?? 0) > 1_000_000
              ? `${((collection.totalTokens ?? 0) / 1_000_000).toFixed(1)}M`
              : undefined
          }
          value={(collection.totalTokens ?? 0).toLocaleString()}
        />
      </div>

      {/* Retrieval & injection config */}
      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ScanSearch className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Retrieval Settings</h3>
          </div>
          <div className="divide-y divide-border px-4">
            <ConfigRow
              label="Max Context Tokens"
              value={collection.maxContextTokens.toLocaleString()}
            />
            <ConfigRow label="Top K" value={collection.topK} />
            <ConfigRow
              label="Similarity Threshold"
              value={`${(collection.similarityThreshold * 100).toFixed(0)}%`}
            />
            <ConfigRow
              label="Default Collection"
              value={
                collection.isDefault ? (
                  <Badge>Yes</Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Created{" "}
          {formatDistanceToNow(new Date(collection.createdAt), {
            addSuffix: true
          })}
        </span>
        <span>
          Updated{" "}
          {formatDistanceToNow(new Date(collection.updatedAt), {
            addSuffix: true
          })}
        </span>
        {collection.isEnabled ? (
          <Badge variant="neutral">Active</Badge>
        ) : (
          <Badge variant="error">Disabled</Badge>
        )}
      </div>
    </div>
  );
};

export { CollectionStats };
