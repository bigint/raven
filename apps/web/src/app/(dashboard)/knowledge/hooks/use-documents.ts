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

export interface DocumentsResponse {
  readonly documents: Document[];
  readonly total: number;
}

const DOCUMENTS_PAGE_SIZE = 50;

export const documentsQueryOptions = (collectionId: string, page: number = 0) =>
  queryOptions({
    queryFn: () =>
      api.get<DocumentsResponse>(
        `/v1/knowledge/collections/${collectionId}/documents?limit=${DOCUMENTS_PAGE_SIZE}&offset=${page * DOCUMENTS_PAGE_SIZE}`
      ),
    queryKey: ["knowledge-documents", collectionId, page]
  });

export const batchStatusQueryOptions = (
  collectionId: string,
  documentIds: string[]
) =>
  queryOptions({
    queryFn: () =>
      api.post<{ statuses: Document[] }>(
        `/v1/knowledge/collections/${collectionId}/documents/batch/status`,
        { document_ids: documentIds }
      ),
    queryKey: ["knowledge-documents-status", collectionId, documentIds]
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

export interface S3IngestParams {
  readonly bucket: string;
  readonly prefix?: string;
  readonly region?: string;
  readonly endpoint_url?: string;
  readonly access_key?: string;
  readonly secret_key?: string;
}

export interface S3IngestResponse {
  readonly status: string;
  readonly documents: Document[];
  readonly total: number;
  readonly skipped: string[];
}

export const useS3Ingest = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: S3IngestParams) => {
      const promise = ky
        .post(
          `${API_URL}/v1/knowledge/collections/${collectionId}/documents/s3`,
          { credentials: "include", json: params, timeout: 300_000 }
        )
        .json<S3IngestResponse>();
      toast.promise(promise, {
        error: (err) =>
          err instanceof Error ? err.message : "S3 import failed",
        loading: "Importing from S3...",
        success: (data) =>
          `${data.total} document${data.total === 1 ? "" : "s"} imported from S3`
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
