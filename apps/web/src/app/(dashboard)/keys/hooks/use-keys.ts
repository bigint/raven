"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface VirtualKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "live" | "test";
  rateLimitRpm: number | null;
  rateLimitRpd: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateKeyResponse extends VirtualKey {
  key: string;
}

export interface CreateKeyInput {
  name: string;
  environment: "live" | "test";
  expiresAt?: string;
  rateLimitRpm?: number;
  rateLimitRpd?: number;
}

export interface UpdateKeyInput {
  name?: string;
  expiresAt?: string | null;
  rateLimitRpm?: number | null;
  rateLimitRpd?: number | null;
  isActive?: boolean;
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
