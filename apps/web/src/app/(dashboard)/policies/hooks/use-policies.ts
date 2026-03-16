"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PolicyRule {
  id: string;
  name: string;
  type: "deterministic" | "statistical" | "ml_model";
  enforcement: "block" | "warn" | "log" | "redact" | "alert";
  priority: number;
  isEnabled: boolean;
  condition: Record<string, unknown>;
  complianceMap: Record<string, string>;
}

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: "active" | "draft" | "archived";
  scope: "platform" | "organization" | "team" | "key";
  complianceFrameworks: string[];
  isEnabled: boolean;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
}

export const SCOPE_OPTIONS = [
  { label: "Platform", value: "platform" },
  { label: "Organization", value: "organization" },
  { label: "Team", value: "team" },
  { label: "Key", value: "key" }
];

export const SCOPE_LABELS: Record<string, string> = {
  key: "Key",
  organization: "Organization",
  platform: "Platform",
  team: "Team"
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  archived: "Archived",
  draft: "Draft"
};

export const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "neutral"
> = {
  active: "success",
  archived: "neutral",
  draft: "warning"
};

export const COMPLIANCE_FRAMEWORKS = [
  { id: "soc2", label: "SOC 2" },
  { id: "hipaa", label: "HIPAA" },
  { id: "gdpr", label: "GDPR" },
  { id: "eu-ai-act", label: "EU AI Act" }
];

export const policiesQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Policy[]>("/v1/policies"),
    queryKey: ["policies"]
  });

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      scope?: string;
      complianceFrameworks?: string[];
      rules?: Array<{
        name: string;
        type: string;
        enforcement: string;
        priority?: number;
        condition: Record<string, unknown>;
      }>;
    }) => api.post<Policy>("/v1/policies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    }
  });
};

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.put<Policy>(`/v1/policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    }
  });
};

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    }
  });
};
