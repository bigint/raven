"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

export interface Collection {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly embedding_provider: string;
  readonly embedding_model: string;
  readonly dimension: number;
  readonly chunk_size: number;
  readonly chunk_overlap: number;
  readonly document_count: number;
  readonly has_api_key: boolean;
  readonly reranking_enabled: boolean;
  readonly reranking_model: string;
  readonly has_reranking_api_key: boolean;
  readonly default_top_k: number;
  readonly default_min_score: number | null;
  readonly default_search_mode: string;
  readonly is_default: boolean;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateCollectionInput {
  readonly name: string;
  readonly description?: string;
  readonly chunk_overlap?: number;
  readonly chunk_size?: number;
  readonly default_min_score?: number;
  readonly default_search_mode?: string;
  readonly default_top_k?: number;
  readonly dimension?: number;
  readonly embedding_api_key?: string;
  readonly embedding_model?: string;
  readonly embedding_provider?: string;
  readonly is_default?: boolean;
}

export interface UpdateCollectionInput {
  readonly description?: string | null;
  readonly is_default?: boolean;
}

export const collectionsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Collection[]>("/v1/knowledge/collections"),
    queryKey: ["knowledge-collections"]
  });

export const collectionDetailQueryOptions = (name: string) =>
  queryOptions({
    queryFn: () => api.get<Collection>(`/v1/knowledge/collections/${name}`),
    queryKey: ["knowledge-collections", name]
  });

const {
  useCreate: useCreateCollection,
  useUpdate: useUpdateCollection,
  useDelete: useDeleteCollection
} = createCrudHooks<
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput & { id: string }
>({
  endpoint: "/v1/knowledge/collections",
  labels: { plural: "Collections", singular: "Collection" },
  queryKey: ["knowledge-collections"]
});

export { useCreateCollection, useDeleteCollection, useUpdateCollection };
