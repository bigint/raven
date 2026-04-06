"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SearchResult {
  readonly results: {
    readonly id: string;
    readonly text: string;
    readonly score: number;
    readonly document_id: string | null;
    readonly chunk_index: number | null;
    readonly metadata: Record<string, unknown>;
  }[];
  readonly query: string;
  readonly collection: string;
  readonly total: number;
}

export const useKnowledgeSearch = () =>
  useMutation({
    mutationFn: (data: { query: string; collectionName?: string }) =>
      api.post<SearchResult>("/v1/knowledge/search", data)
  });
