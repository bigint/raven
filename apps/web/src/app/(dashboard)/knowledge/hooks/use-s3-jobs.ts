"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import ky from "ky";
import { toast } from "sonner";
import { API_URL, api } from "@/lib/api";
import type { Document } from "./use-documents";

export interface S3Job {
  readonly id: string;
  readonly collection_name: string;
  readonly bucket: string;
  readonly prefix: string;
  readonly region: string;
  readonly endpoint_url: string | null;
  readonly file_types: string[];
  readonly status: "pending" | "listing" | "ingesting" | "complete" | "failed";
  readonly total_found: number;
  readonly total_ingested: number;
  readonly total_skipped: number;
  readonly error_message: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface S3JobsResponse {
  readonly jobs: S3Job[];
  readonly total: number;
}

const ACTIVE_STATUSES = new Set(["pending", "listing", "ingesting"]);

export const s3JobsQueryOptions = (collectionId: string) =>
  queryOptions({
    queryFn: () =>
      api.get<S3JobsResponse>(
        `/v1/knowledge/collections/${collectionId}/documents/s3-jobs`
      ),
    queryKey: ["knowledge-s3-jobs", collectionId],
    refetchInterval: (query) =>
      query.state.data?.jobs.some((j) => ACTIVE_STATUSES.has(j.status))
        ? 5000
        : false
  });

export const useResyncS3Job = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => {
      const promise = api.post(
        `/v1/knowledge/collections/${collectionId}/documents/s3-jobs/${jobId}/resync`
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Re-syncing...",
        success: "Re-sync started — new files will be imported"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-s3-jobs", collectionId]
      });
    }
  });
};

export const useDeleteS3Job = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => {
      const promise = api.delete(
        `/v1/knowledge/collections/${collectionId}/documents/s3-jobs/${jobId}`
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting import...",
        success: "Import deleted"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-s3-jobs", collectionId]
      });
    }
  });
};

export const useUpdateS3Job = (collectionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      fileTypes
    }: {
      jobId: string;
      fileTypes: string[];
    }) => {
      const promise = api.patch<S3Job>(
        `/v1/knowledge/collections/${collectionId}/documents/s3-jobs/${jobId}`,
        { file_types: fileTypes }
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating import...",
        success: "Import updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-s3-jobs", collectionId]
      });
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
  readonly file_types?: string[];
}

interface S3IngestResponse {
  readonly status: string;
  readonly message: string;
  readonly documents: Document[];
  readonly total: number;
  readonly skipped: readonly string[];
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
        success:
          "S3 import started — documents will appear as they are processed"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", collectionId]
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge-s3-jobs", collectionId]
      });
    }
  });
};
