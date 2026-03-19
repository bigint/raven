"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface VirtualKey {
  readonly id: string;
  readonly name: string;
  readonly keyPrefix: string;
  readonly environment: "live" | "test";
  readonly rateLimitRpm: number | null;
  readonly rateLimitRpd: number | null;
  readonly isActive: boolean;
  readonly expiresAt: string | null;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}

export interface CreateKeyResponse extends VirtualKey {
  readonly key: string;
}

export interface CreateKeyInput {
  readonly name: string;
  readonly environment: "live" | "test";
  readonly expiresAt?: string;
  readonly rateLimitRpm?: number;
  readonly rateLimitRpd?: number;
}

export interface UpdateKeyInput {
  readonly name?: string;
  readonly expiresAt?: string | null;
  readonly rateLimitRpm?: number | null;
  readonly rateLimitRpd?: number | null;
  readonly isActive?: boolean;
}

export const keysQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<VirtualKey[]>("/v1/keys"),
    queryKey: ["keys"]
  });

export const useCreateKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKeyInput) =>
      api.post<CreateKeyResponse>("/v1/keys", data),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    }
  });
};

export const useUpdateKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKeyInput }) =>
      api.put<VirtualKey>(`/v1/keys/${id}`, data),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    }
  });
};

export const useDeleteKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/keys/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    }
  });
};
