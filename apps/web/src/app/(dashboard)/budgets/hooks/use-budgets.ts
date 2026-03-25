import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

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

const {
  useCreate: useCreateBudget,
  useUpdate: useUpdateBudget,
  useDelete: useDeleteBudget
} = createCrudHooks<Budget, BudgetInput, BudgetInput & { id: string }>({
  endpoint: "/v1/budgets",
  labels: { plural: "Budgets", singular: "Budget" },
  queryKey: ["budgets"]
});

export { useCreateBudget, useDeleteBudget, useUpdateBudget };
