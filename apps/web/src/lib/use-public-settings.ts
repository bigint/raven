import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PublicSettings {
  readonly instance_name?: string;
  readonly instance_url?: string;
  readonly knowledge_enabled?: string;
  readonly password_min_length?: string;
  readonly signup_enabled?: string;
}

export const publicSettingsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<PublicSettings>("/v1/settings/public"),
    queryKey: ["settings", "public"],
    staleTime: 60_000
  });

export const usePublicSettings = () => useQuery(publicSettingsQueryOptions());

export const useKnowledgeEnabled = (): boolean => {
  const { data } = usePublicSettings();
  return data?.knowledge_enabled === "true";
};
