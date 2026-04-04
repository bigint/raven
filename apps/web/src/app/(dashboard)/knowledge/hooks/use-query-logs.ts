"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface KnowledgeStats {
  readonly collectionCount: number;
  readonly documentCount: number;
  readonly totalChunks: number;
  readonly totalQueries: number;
  readonly avgChunksPerQuery: number;
  readonly avgSimilarityScore: number;
  readonly topCollections: {
    readonly collectionId: string;
    readonly collectionName: string;
    readonly queryCount: number;
  }[];
}

export interface QueryLog {
  readonly id: string;
  readonly collectionName: string;
  readonly queryText: string;
  readonly chunksRetrieved: number;
  readonly chunksInjected: number;
  readonly topSimilarityScore: number;
  readonly totalContextTokens: number;
  readonly latencyMs: number;
  readonly createdAt: string;
}

export const knowledgeStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<KnowledgeStats>("/v1/admin/knowledge/analytics"),
    queryKey: ["knowledge-analytics"]
  });

export const queryLogsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<QueryLog[]>("/v1/admin/knowledge/query-logs"),
    queryKey: ["knowledge-query-logs"]
  });
