"use client";

import type { CollectionDetail } from "../../hooks/use-collections";

interface CollectionStatsProps {
  readonly collection: CollectionDetail;
}

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
  </div>
);

const CollectionStats = ({ collection }: CollectionStatsProps) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
    <StatCard label="Documents" value={collection.documentCount} />
    <StatCard label="Chunks" value={collection.chunkCount} />
    <StatCard
      label="Total Tokens"
      value={collection.totalTokens.toLocaleString()}
    />
    <StatCard label="Embedding Model" value={collection.embeddingModel} />
  </div>
);

export { CollectionStats };
