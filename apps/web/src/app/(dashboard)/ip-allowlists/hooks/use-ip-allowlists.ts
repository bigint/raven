"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface IpRule {
  id: string;
  cidr: string;
  description: string | null;
  isEnabled: boolean;
  createdAt: string;
}

export const ipRulesQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<IpRule[]>("/v1/ip-allowlists"),
    queryKey: ["ip-allowlists"]
  });

export const useCreateIpRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cidr: string; description?: string }) =>
      api.post<IpRule>("/v1/ip-allowlists", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ip-allowlists"] })
  });
};

export const useUpdateIpRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      cidr?: string;
      description?: string;
      isEnabled?: boolean;
    }) => api.put<IpRule>(`/v1/ip-allowlists/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ip-allowlists"] })
  });
};

export const useDeleteIpRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/ip-allowlists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ip-allowlists"] })
  });
};
