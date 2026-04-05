"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

export interface Collection {
  readonly id: string;
  readonly name: string;
  readonly maxContextTokens: number;
  readonly isDefault: boolean;
  readonly isEnabled: boolean;
  readonly documentCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BigRAGCollectionConfig {
  readonly embeddingProvider: string;
  readonly embeddingModel: string;
  readonly dimension: number;
  readonly chunkSize: number;
  readonly chunkOverlap: number;
  readonly defaultTopK: number;
  readonly defaultMinScore: number | null;
  readonly defaultSearchMode: string;
}

export interface CollectionDetail extends Collection {
  readonly description: string | null;
  readonly chunkCount: number;
  readonly bigrag: BigRAGCollectionConfig | null;
}

export interface CreateCollectionInput {
  readonly name: string;
  readonly description?: string;
  // bigRAG-specific fields (forwarded to bigRAG, not stored in Raven)
  readonly chunkOverlap?: number;
  readonly chunkSize?: number;
  readonly defaultMinScore?: number;
  readonly defaultSearchMode?: string;
  readonly defaultTopK?: number;
  readonly dimension?: number;
  readonly embeddingApiKey?: string;
  readonly embeddingModel?: string;
  readonly embeddingProvider?: string;
  // Raven-specific fields
  readonly isDefault?: boolean;
  readonly maxContextTokens?: number;
}

export interface UpdateCollectionInput {
  readonly description?: string | null;
  readonly isDefault?: boolean;
  readonly isEnabled?: boolean;
  readonly maxContextTokens?: number;
}

export const collectionsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Collection[]>("/v1/knowledge/collections"),
    queryKey: ["knowledge-collections"]
  });

export const collectionDetailQueryOptions = (id: string) =>
  queryOptions({
    queryFn: () => api.get<CollectionDetail>(`/v1/knowledge/collections/${id}`),
    queryKey: ["knowledge-collections", id]
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
