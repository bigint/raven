"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import { toast } from "sonner";
import { API_URL, api } from "@/lib/api";

export interface Document {
  readonly id: string;
  readonly collection_id: string;
  readonly filename: string;
  readonly file_type: string;
  readonly file_size: number;
  readonly chunk_count: number;
  readonly status: "pending" | "processing" | "ready" | "failed";
  readonly error_message: string | null;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Chunk {
  readonly id: string;
  readonly chunk_index: number;
  readonly text: string;
}

export interface ChunksResponse {
  readonly chunks: Chunk[];
  readonly total: number;
}

import { queryOptions } from "@tanstack/react-query";

export const documentsQueryOptions = (collectionId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await api.get<{ documents: Document[]; total: number }>(
        `/v1/knowledge/collections/${collectionId}/documents`
      );
      return res.documents;
    },
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

export const useBatchUploadDocuments = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const promise = ky
        .post(
          `${API_URL}/v1/knowledge/collections/${collectionId}/documents/batch/upload`,
          { body: formData, credentials: "include", timeout: 300_000 }
        )
        .json<{ data: Document[] }>();
      toast.promise(promise, {
        error: (err) =>
          err instanceof Error ? err.message : "Batch upload failed",
        loading: `Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`,
        success: `${files.length} file${files.length > 1 ? "s" : ""} uploaded`
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

export const useBatchDeleteDocuments = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentIds: string[]) => {
      const promise = api.post<{ deleted: number; errors: unknown[] }>(
        `/v1/knowledge/collections/${collectionId}/documents/batch/delete`,
        { document_ids: documentIds }
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: `Deleting ${documentIds.length} document${documentIds.length > 1 ? "s" : ""}...`,
        success: `${documentIds.length} document${documentIds.length > 1 ? "s" : ""} deleted`
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
