"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

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

// Create returns CreateKeyResponse (includes the raw key), which differs from
// the entity type VirtualKey, so it must stay manual.
export const useCreateKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKeyInput) => {
      const promise = api.post<CreateKeyResponse>("/v1/keys", data);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Creating key...",
        success: "Key created"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    }
  });
};

const { useUpdate: useUpdateKey, useDelete: useDeleteKey } = createCrudHooks<
  VirtualKey,
  CreateKeyInput,
  { id: string; data: UpdateKeyInput }
>({
  endpoint: "/v1/keys",
  labels: { plural: "Keys", singular: "Key" },
  queryKey: ["keys"]
});

export { useDeleteKey, useUpdateKey };
