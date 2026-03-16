"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface EvaluationResult {
  id: string;
  input: string;
  actualOutput: string | null;
  score: string | null;
  passed: string | null;
  metrics: Record<string, number>;
  feedback: string | null;
}

export interface Evaluation {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "running" | "completed" | "failed";
  model: string;
  evaluatorType: string;
  score: string | null;
  sampleCount: number;
  passCount: number;
  failCount: number;
  createdAt: string;
  results?: EvaluationResult[];
}

export const evaluationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Evaluation[]>("/v1/evaluations"),
    queryKey: ["evaluations"]
  });

export const useCreateEvaluation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      model: string;
      evaluatorType: string;
      description?: string;
    }) => api.post<Evaluation>("/v1/evaluations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] })
  });
};

export const useDeleteEvaluation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/evaluations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] })
  });
};

export const useRunEvaluation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      samples
    }: {
      id: string;
      samples: Array<{
        prompt: string;
        response: string;
        expectedOutput?: string;
      }>;
    }) => api.post(`/v1/evaluations/${id}/run`, { samples }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] })
  });
};
