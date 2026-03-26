"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SearchResult {
  readonly chunks: {
    readonly id: string;
    readonly content: string;
    readonly score: number;
    readonly documentId: string;
    readonly documentTitle: string;
    readonly chunkIndex: number;
  }[];
  readonly collectionId: string;
}

export const useKnowledgeSearch = () =>
  useMutation({
    mutationFn: (data: { query: string; collectionId?: string }) =>
      api.post<SearchResult>("/v1/knowledge/search", data)
  });
