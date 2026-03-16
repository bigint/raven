import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface McpServer {
  id: string;
  name: string;
  description: string | null;
  url: string;
  transport: "stdio" | "sse" | "streamable-http";
  status: "active" | "inactive" | "error";
  capabilities: string[];
  toolCount: number;
  isEnabled: boolean;
  lastHealthCheck: string | null;
  createdAt: string;
}

export const TRANSPORT_OPTIONS = [
  { label: "stdio", value: "stdio" },
  { label: "SSE", value: "sse" },
  { label: "Streamable HTTP", value: "streamable-http" }
];

export const TRANSPORT_LABELS: Record<string, string> = {
  sse: "SSE",
  stdio: "stdio",
  "streamable-http": "Streamable HTTP"
};

export const mcpServersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<McpServer[]>("/v1/mcp"),
    queryKey: ["mcp"]
  });

interface CreateMcpServerInput {
  name: string;
  description?: string;
  url: string;
  transport: string;
  capabilities?: string[];
}

interface UpdateMcpServerInput {
  id: string;
  name?: string;
  description?: string;
  url?: string;
  transport?: string;
  capabilities?: string[];
  isEnabled?: boolean;
}

export const useCreateMcpServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMcpServerInput) =>
      api.post<McpServer>("/v1/mcp", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp"] });
    }
  });
};

export const useUpdateMcpServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateMcpServerInput) =>
      api.put<McpServer>(`/v1/mcp/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp"] });
    }
  });
};

export const useDeleteMcpServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/mcp/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp"] });
    }
  });
};
