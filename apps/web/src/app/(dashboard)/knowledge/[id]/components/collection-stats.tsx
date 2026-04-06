"use client";

import { Badge } from "@raven/ui";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Cpu, ScanSearch, Settings } from "lucide-react";
import type { Collection } from "../../hooks/use-collections";

interface CollectionStatsProps {
  readonly collection: Collection;
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
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={BookOpen}
          label="Documents"
          value={collection.document_count}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </div>
      </div>

      {/* Default collection */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Settings className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Settings</h3>
        </div>
        <div className="divide-y divide-border px-4">
          <ConfigRow
            label="Default Collection"
            value={
              collection.is_default ? (
                <Badge>Yes</Badge>
              ) : (
                <span className="text-muted-foreground">No</span>
              )
            }
          />
        </div>
      </div>

      {/* Footer meta */}
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
