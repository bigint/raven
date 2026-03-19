"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Stats {
  readonly totalRequests: number;
  readonly totalCost: string;
  readonly avgLatencyMs: string;
  readonly cacheHitRate: string;
}

interface UsageRow {
  readonly provider: string;
  readonly providerConfigName: string | null;
  readonly model: string;
  readonly totalRequests: number;
  readonly totalCost: string;
  readonly avgLatencyMs: string;
}

interface RecentRequest {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly cost: string;
  readonly createdAt: string;
}

interface KeySummary {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly lastUsedAt: string | null;
}

interface ProviderConfig {
  readonly id: string;
  readonly provider: string;
  readonly isEnabled: boolean;
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
  const stats = useQuery({
    ...overviewStatsQueryOptions(),
    refetchInterval: POLL_INTERVAL
  });
  const usage = useQuery({
    ...overviewUsageQueryOptions(),
    refetchInterval: POLL_INTERVAL
  });
  const requests = useQuery({
    ...overviewRequestsQueryOptions(),
    refetchInterval: POLL_INTERVAL
  });
  const keys = useQuery(overviewKeysQueryOptions());
  const providers = useQuery(overviewProvidersQueryOptions());

  return { keys, providers, requests, stats, usage };
};

export type { KeySummary, RecentRequest, Stats, UsageRow };
