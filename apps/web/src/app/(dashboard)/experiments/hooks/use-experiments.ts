"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ExperimentVariant {
  id: string;
  name: string;
  model: string;
  weight: number;
  requestCount: number;
  totalCost: string;
  errorCount: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "running" | "paused" | "completed";
  primaryMetric: string;
  minimumSamples: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  variants?: ExperimentVariant[];
}

export const experimentsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Experiment[]>("/v1/experiments"),
    queryKey: ["experiments"]
  });

export const useCreateExperiment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      primaryMetric?: string;
      minimumSamples?: number;
      variants: Array<{ name: string; model: string; weight: number }>;
    }) => api.post<Experiment>("/v1/experiments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] })
  });
};

export const useUpdateExperiment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      status?: string;
      name?: string;
    }) => api.put<Experiment>(`/v1/experiments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] })
  });
};

export const useDeleteExperiment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/experiments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] })
  });
};
