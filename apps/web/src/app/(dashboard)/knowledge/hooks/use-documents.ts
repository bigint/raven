"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import { toast } from "sonner";
import { API_URL, api } from "@/lib/api";

export interface Document {
  readonly id: string;
  readonly collectionId: string;
  readonly title: string;
  readonly sourceType: "file" | "url" | "image";
  readonly sourceUrl: string | null;
  readonly mimeType: string;
  readonly fileSize: number | null;
  readonly chunkCount: number;
  readonly tokenCount: number;
  readonly status: "pending" | "processing" | "ready" | "failed";
  readonly errorMessage: string | null;
  readonly recrawlEnabled: boolean;
  readonly recrawlIntervalHours: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Chunk {
  readonly id: string;
  readonly chunkIndex: number;
  readonly content: string;
  readonly tokenCount: number;
}

export interface ChunksResponse {
  readonly chunks: Chunk[];
  readonly total: number;
}

import { queryOptions } from "@tanstack/react-query";

export const documentsQueryOptions = (collectionId: string) =>
  queryOptions({
    queryFn: () =>
      api.get<Document[]>(
        `/v1/knowledge/collections/${collectionId}/documents`
      ),
    queryKey: ["knowledge-documents", collectionId]
  });

export const documentDetailQueryOptions = (docId: string) =>
  queryOptions({
    queryFn: () => api.get<Document>(`/v1/knowledge/documents/${docId}`),
    queryKey: ["knowledge-document", docId]
  });

export const documentChunksQueryOptions = (
  docId: string,
  limit: number,
  offset: number
) =>
  queryOptions({
    queryFn: () =>
      api.get<ChunksResponse>(
        `/v1/knowledge/documents/${docId}/chunks?limit=${limit}&offset=${offset}`
      ),
    queryKey: ["knowledge-document-chunks", docId, limit, offset]
  });

export const useUploadDocument = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const promise = ky
        .post(`${API_URL}/v1/knowledge/collections/${collectionId}/documents`, {
          body: formData,
          credentials: "include"
        })
        .json<Document>();
      toast.promise(promise, {
        error: (err) => (err instanceof Error ? err.message : "Upload failed"),
        loading: "Uploading document...",
        success: "Document uploaded"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", collectionId]
      });
    }
  });
};

export const useIngestUrl = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      url: string;
      title?: string;
      crawlLimit?: number;
      recrawlEnabled?: boolean;
      recrawlIntervalHours?: number;
    }) => {
      const promise = api.post<Document>(
        `/v1/knowledge/collections/${collectionId}/documents/url`,
        data
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Ingesting URL...",
        success: "URL ingested"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", collectionId]
      });
    }
  });
};

export const useUploadImage = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const promise = ky
        .post(
          `${API_URL}/v1/knowledge/collections/${collectionId}/documents/image`,
          { body: formData, credentials: "include" }
        )
        .json<Document>();
      toast.promise(promise, {
        error: (err) => (err instanceof Error ? err.message : "Upload failed"),
        loading: "Uploading image...",
        success: "Image uploaded"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", collectionId]
      });
    }
  });
};

export const useDeleteDocument = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/knowledge/documents/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting document...",
        success: "Document deleted"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", collectionId]
      });
    }
  });
};

export const useReprocessDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.post(`/v1/knowledge/documents/${id}/reprocess`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Reprocessing document...",
        success: "Document reprocessing started"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    }
  });
};
