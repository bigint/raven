"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SSOConfig {
  organizationId: string;
  configured: boolean;
  enforced: boolean;
  provider: { name: string; type: string; enabled: boolean } | null;
  availablePresets: string[];
}

export const ssoQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<SSOConfig>("/v1/sso"),
    queryKey: ["sso"]
  });

export const useConfigureSSO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      provider: {
        name: string;
        type: string;
        config: Record<string, unknown>;
      };
      enforced?: boolean;
      jitProvisioning?: boolean;
      defaultRole?: string;
      allowedDomains?: string[];
    }) => api.post("/v1/sso", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sso"] })
  });
};

export const useDeleteSSO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/v1/sso"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sso"] })
  });
};
