import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CatalogItem {
  id: string;
  type:
    | "model"
    | "agent"
    | "mcp_server"
    | "prompt_template"
    | "guardrail_policy";
  name: string;
  description: string | null;
  status: "pending_approval" | "approved" | "rejected" | "deprecated";
  version: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
}

export const TYPE_OPTIONS = [
  { label: "Model", value: "model" },
  { label: "Agent", value: "agent" },
  { label: "MCP Server", value: "mcp_server" },
  { label: "Prompt Template", value: "prompt_template" },
  { label: "Guardrail Policy", value: "guardrail_policy" }
];

export const TYPE_LABELS: Record<string, string> = {
  agent: "Agent",
  guardrail_policy: "Guardrail Policy",
  mcp_server: "MCP Server",
  model: "Model",
  prompt_template: "Prompt Template"
};

export const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  deprecated: "Deprecated",
  pending_approval: "Pending",
  rejected: "Rejected"
};

export const catalogQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CatalogItem[]>("/v1/catalog"),
    queryKey: ["catalog"]
  });

interface CreateCatalogInput {
  name: string;
  description?: string;
  type: string;
  version: string;
  tags?: string[];
}

interface UpdateCatalogInput {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  version?: string;
  tags?: string[];
  status?: string;
}

export const useCreateCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCatalogInput) =>
      api.post<CatalogItem>("/v1/catalog", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    }
  });
};

export const useUpdateCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCatalogInput) =>
      api.put<CatalogItem>(`/v1/catalog/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    }
  });
};

export const useDeleteCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    }
  });
};
