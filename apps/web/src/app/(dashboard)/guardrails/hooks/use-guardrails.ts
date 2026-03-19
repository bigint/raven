import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface Guardrail {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  action: string;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export const TYPE_OPTIONS = [
  { label: "Block Topics", value: "block_topics" },
  { label: "PII Detection", value: "pii_detection" },
  { label: "Content Filter", value: "content_filter" },
  { label: "Custom Regex", value: "custom_regex" }
];

export const ACTION_OPTIONS = [
  { label: "Block", value: "block" },
  { label: "Warn", value: "warn" },
  { label: "Log", value: "log" }
];

export const TYPE_LABELS: Record<string, string> = {
  block_topics: "Block Topics",
  content_filter: "Content Filter",
  custom_regex: "Custom Regex",
  pii_detection: "PII Detection"
};

export const ACTION_LABELS: Record<string, string> = {
  block: "Block",
  log: "Log",
  warn: "Warn"
};

export const guardrailsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Guardrail[]>("/v1/guardrails"),
    queryKey: ["guardrails"]
  });

interface GuardrailInput {
  name: string;
  type: string;
  config: Record<string, unknown>;
  action: string;
  isEnabled: boolean;
  priority: number;
}

export const useCreateGuardrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GuardrailInput) =>
      api.post<Guardrail>("/v1/guardrails", input),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    }
  });
};

export const useUpdateGuardrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: GuardrailInput & { id: string }) =>
      api.put<Guardrail>(`/v1/guardrails/${id}`, body),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    }
  });
};

export const useDeleteGuardrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/guardrails/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    }
  });
};
