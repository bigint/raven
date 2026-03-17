"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Stats {
  totalRequests: number;
  totalCost: string;
  avgLatencyMs: string;
  cacheHitRate: string;
}

interface UsageRow {
  provider: string;
  providerConfigName: string | null;
  model: string;
  totalRequests: number;
  totalCost: string;
  avgLatencyMs: string;
}

interface RecentRequest {
  id: string;
  provider: string;
  model: string;
  statusCode: number;
  latencyMs: number;
  cost: string;
  createdAt: string;
}

interface KeySummary {
  id: string;
  name: string;
  isActive: boolean;
  lastUsedAt: string | null;
}

interface ProviderConfig {
  id: string;
  provider: string;
  isEnabled: boolean;
}

const THIRTY_DAYS_MS = 2_592_000_000;

const overviewFrom = () => new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

export const overviewStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Stats>(`/v1/analytics/stats?from=${overviewFrom()}`),
    queryKey: ["overview", "stats"]
  });

export const overviewUsageQueryOptions = () =>
  queryOptions({
    queryFn: () =>
      api.get<UsageRow[]>(`/v1/analytics/usage?from=${overviewFrom()}`),
    queryKey: ["overview", "usage"]
  });

export const overviewRequestsQueryOptions = () =>
  queryOptions({
    queryFn: async () => {
      const res = await api.get<{
        data: RecentRequest[];
        pagination: unknown;
      }>("/v1/analytics/requests?limit=5");
      return res.data;
    },
    queryKey: ["overview", "requests"]
  });

export const overviewKeysQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<KeySummary[]>("/v1/keys"),
    queryKey: ["overview", "keys"]
  });

export const overviewProvidersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ProviderConfig[]>("/v1/providers"),
    queryKey: ["overview", "providers"]
  });

const POLL_INTERVAL = 30_000;

export const useOverview = () => {
  const statsQuery = useQuery({
    ...overviewStatsQueryOptions(),
    refetchInterval: POLL_INTERVAL
  });
  const usageQuery = useQuery({
    ...overviewUsageQueryOptions(),
    refetchInterval: POLL_INTERVAL
  });
  const requestsQuery = useQuery({
    ...overviewRequestsQueryOptions(),
    refetchInterval: POLL_INTERVAL
  });
  const keysQuery = useQuery(overviewKeysQueryOptions());
  const providersQuery = useQuery(overviewProvidersQueryOptions());

  const isLoading =
    statsQuery.isPending ||
    usageQuery.isPending ||
    requestsQuery.isPending ||
    keysQuery.isPending ||
    providersQuery.isPending;

  return {
    isLoading,
    keys: keysQuery.data ?? [],
    providers: providersQuery.data ?? [],
    recentRequests: requestsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    usage: usageQuery.data ?? []
  };
};

export type { KeySummary, RecentRequest, Stats, UsageRow };
