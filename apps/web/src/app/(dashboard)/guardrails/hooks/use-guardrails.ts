import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface Guardrail {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly config: Record<string, unknown>;
  readonly action: string;
  readonly isEnabled: boolean;
  readonly priority: number;
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly name: string;
  readonly type: string;
  readonly config: Record<string, unknown>;
  readonly action: string;
  readonly isEnabled: boolean;
  readonly priority: number;
}

export const useCreateGuardrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GuardrailInput) => {
      const promise = api.post<Guardrail>("/v1/guardrails", input);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Creating guardrail...",
        success: "Guardrail created"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    }
  });
};

export const useUpdateGuardrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: GuardrailInput & { id: string }) => {
      const promise = api.put<Guardrail>(`/v1/guardrails/${id}`, body);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating guardrail...",
        success: "Guardrail updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    }
  });
};

export const useDeleteGuardrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/guardrails/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting guardrail...",
        success: "Guardrail deleted"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    }
  });
};
