"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

export interface Collection {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;
  readonly chunkStrategy: string;
  readonly chunkSize: number;
  readonly chunkOverlap: number;
  readonly topK: number;
  readonly similarityThreshold: number;
  readonly maxContextTokens: number;
  readonly rerankingEnabled: boolean;
  readonly isDefault: boolean;
  readonly isEnabled: boolean;
  readonly documentCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CollectionDetail extends Collection {
  readonly chunkCount: number;
  readonly totalTokens: number;
}

export interface CreateCollectionInput {
  readonly name: string;
  readonly description?: string;
  readonly embeddingModel?: string;
  readonly embeddingDimensions?: number;
  readonly chunkStrategy?: string;
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
  readonly topK?: number;
  readonly similarityThreshold?: number;
  readonly maxContextTokens?: number;
  readonly rerankingEnabled?: boolean;
  readonly isDefault?: boolean;
  readonly isEnabled?: boolean;
}

export interface UpdateCollectionInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly embeddingModel?: string;
  readonly embeddingDimensions?: number;
  readonly chunkStrategy?: string;
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
  readonly topK?: number;
  readonly similarityThreshold?: number;
  readonly maxContextTokens?: number;
  readonly rerankingEnabled?: boolean;
  readonly isDefault?: boolean;
  readonly isEnabled?: boolean;
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
