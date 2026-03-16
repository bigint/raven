"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Plugin {
  id: string;
  name: string;
  description: string | null;
  version: string;
  hooks: string[];
  isEnabled: boolean;
  isOfficial: boolean;
  createdAt: string;
}

export const pluginsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Plugin[]>("/v1/plugins"),
    queryKey: ["plugins"]
  });

export const useCreatePlugin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      version?: string;
      hooks?: string[];
    }) => api.post<Plugin>("/v1/plugins", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] })
  });
};

export const useUpdatePlugin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      isEnabled?: boolean;
      name?: string;
    }) => api.put<Plugin>(`/v1/plugins/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] })
  });
};

export const useDeletePlugin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/plugins/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] })
  });
};
