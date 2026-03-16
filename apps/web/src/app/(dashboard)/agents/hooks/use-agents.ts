import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  type: "autonomous" | "semi_autonomous" | "tool";
  status: "active" | "suspended" | "revoked";
  capabilities: Record<string, unknown>;
  budgetMax: string | null;
  budgetPeriod: string | null;
  budgetSpent: string;
  delegationDepth: number;
  canDelegate: boolean;
  lastActiveAt: string | null;
  createdAt: string;
}

export const TYPE_OPTIONS = [
  { label: "Autonomous", value: "autonomous" },
  { label: "Semi-Autonomous", value: "semi_autonomous" },
  { label: "Tool", value: "tool" }
];

export const TYPE_LABELS: Record<string, string> = {
  autonomous: "Autonomous",
  semi_autonomous: "Semi-Autonomous",
  tool: "Tool"
};

export const BUDGET_PERIOD_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" }
];

export const agentsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Agent[]>("/v1/agents"),
    queryKey: ["agents"]
  });

interface CreateAgentInput {
  name: string;
  description?: string;
  type: string;
  budgetMax?: string;
  budgetPeriod?: string;
  canDelegate: boolean;
}

interface UpdateAgentInput {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  budgetMax?: string;
  budgetPeriod?: string;
  canDelegate?: boolean;
}

export const useCreateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAgentInput) =>
      api.post<Agent>("/v1/agents", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    }
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateAgentInput) =>
      api.put<Agent>(`/v1/agents/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    }
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    }
  });
};
