"use client";

import type { Column } from "@raven/ui";
import { DataTable, PageHeader, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  knowledgeStatsQueryOptions,
  type QueryLog,
  queryLogsQueryOptions
} from "../hooks/use-query-logs";

const KnowledgeAnalyticsPage = () => {
  const {
    data: stats,
    isPending: statsLoading,
    error: statsError
  } = useQuery(knowledgeStatsQueryOptions());

  const {
    data: logs = [],
    isPending: logsLoading,
    error: logsError
  } = useQuery(queryLogsQueryOptions());

  const topCollection = stats?.topCollections[0];

  const columns: Column<QueryLog>[] = [
    {
      header: "Collection",
      key: "collectionName",
      render: (log) => (
        <span className="text-sm font-medium">{log.collectionName}</span>
      )
    },
    {
      header: "Query",
      key: "queryText",
      render: (log) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground">
          {log.queryText}
        </span>
      )
    },
    {
      header: "Chunks",
      key: "chunksRetrieved",
      render: (log) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {log.chunksInjected}/{log.chunksRetrieved}
        </span>
      )
    },
    {
      header: "Similarity",
      key: "topSimilarityScore",
      render: (log) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {(log.topSimilarityScore * 100).toFixed(1)}%
        </span>
      )
    },
    {
      header: "Tokens",
      key: "totalContextTokens",
      render: (log) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {log.totalContextTokens.toLocaleString()}
        </span>
      )
    },
    {
      header: "Latency",
      key: "latencyMs",
      render: (log) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {log.latencyMs}ms
        </span>
      )
    },
    {
      className: "text-right",
      header: "Time",
      headerClassName: "text-right",
      key: "createdAt",
      render: (log) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </span>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        description="Knowledge base usage statistics and query logs."
        title="Knowledge Analytics"
      />

      {statsError && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {statsError.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Collections</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">
                {stats?.collectionCount ?? 0}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Documents</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">
                {stats?.documentCount ?? 0}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Chunks</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">
                {(stats?.totalChunks ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Queries (30d)</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">
                {stats?.totalQueries ?? 0}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Avg Chunks / Query</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">
                {(stats?.avgChunksPerQuery ?? 0).toFixed(1)}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Avg Similarity</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">
                {((stats?.avgSimilarityScore ?? 0) * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Top Collection</p>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
            ) : topCollection ? (
              <div>
                <p className="truncate text-sm font-semibold">
                  {topCollection.collectionName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topCollection.queryCount} queries
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {stats?.platform && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Queue Pending</p>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">
                {stats.platform.queue.pending}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Queue Processing</p>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">
                {stats.platform.queue.processing}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Queue Completed</p>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">
                {stats.platform.queue.completed.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Queue Failed</p>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">
                {stats.platform.queue.failed}
              </p>
            </div>
          </div>
        </div>
      )}

      {logsError && (
        <div
          className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {logsError.message}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recent Query Logs</h2>
        <DataTable
          columns={columns}
          data={logs}
          emptyIcon={<Spinner className="size-6" />}
          emptyTitle="No query logs yet"
          keyExtractor={(log) => log.id}
          loading={logsLoading}
          loadingMessage="Loading query logs..."
        />
      </div>
    </div>
  );
};

export default KnowledgeAnalyticsPage;
