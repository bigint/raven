import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

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

const {
  useCreate: useCreateGuardrail,
  useUpdate: useUpdateGuardrail,
  useDelete: useDeleteGuardrail
} = createCrudHooks<Guardrail, GuardrailInput, GuardrailInput & { id: string }>(
  {
    endpoint: "/v1/guardrails",
    labels: { plural: "Guardrails", singular: "Guardrail" },
    queryKey: ["guardrails"]
  }
);

export { useCreateGuardrail, useDeleteGuardrail, useUpdateGuardrail };
