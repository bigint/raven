import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface Budget {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly entityName: string | null;
  readonly limitAmount: number;
  readonly period: string;
  readonly alertThreshold: number;
  readonly createdAt: string;
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
  readonly entityType: string;
  readonly entityId: string;
  readonly limitAmount: number;
  readonly period: string;
  readonly alertThreshold: number;
}

export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BudgetInput) => {
      const promise = api.post<Budget>("/v1/budgets", input);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Creating budget...",
        success: "Budget created"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: BudgetInput & { id: string }) => {
      const promise = api.put<Budget>(`/v1/budgets/${id}`, body);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating budget...",
        success: "Budget updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/budgets/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting budget...",
        success: "Budget deleted"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
};
