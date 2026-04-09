"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface S3Job {
  readonly id: string;
  readonly collection_name: string;
  readonly bucket: string;
  readonly prefix: string;
  readonly region: string;
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
