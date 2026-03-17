import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Budget {
  id: string;
  entityType: string;
  entityId: string;
  limitAmount: number;
  period: string;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export const ENTITY_TYPE_OPTIONS = [
  { label: "Organization", value: "organization" },
  { label: "API Key", value: "key" }
];

export const PERIOD_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Monthly", value: "monthly" }
];

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  key: "API Key",
  organization: "Organization"
};

export const budgetsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Budget[]>("/v1/budgets"),
    queryKey: ["budgets"]
  });

interface BudgetInput {
  entityType: string;
  entityId: string;
  limitAmount: number;
  period: string;
  alertThreshold: number;
}

export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BudgetInput) => api.post<Budget>("/v1/budgets", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: BudgetInput & { id: string }) =>
      api.put<Budget>(`/v1/budgets/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
};
