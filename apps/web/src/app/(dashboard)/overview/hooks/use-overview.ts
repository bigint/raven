"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventStream } from "@/hooks/use-event-stream";
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

export const useOverview = () => {
  const queryClient = useQueryClient();

  const statsQuery = useQuery(overviewStatsQueryOptions());
  const usageQuery = useQuery(overviewUsageQueryOptions());
  const requestsQuery = useQuery(overviewRequestsQueryOptions());
  const keysQuery = useQuery(overviewKeysQueryOptions());

  const isLoading =
    statsQuery.isPending ||
    usageQuery.isPending ||
    requestsQuery.isPending ||
    keysQuery.isPending;

  useEventStream({
    enabled: !isLoading,
    events: ["request.created"],
    onEvent: (data) => {
      const req = data as RecentRequest;
      queryClient.setQueryData<RecentRequest[]>(
        ["overview", "requests"],
        (prev) => (prev ? [req, ...prev].slice(0, 5) : [req])
      );
      queryClient.setQueryData<Stats>(["overview", "stats"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalCost: (Number(prev.totalCost) + Number(req.cost)).toString(),
          totalRequests: prev.totalRequests + 1
        };
      });
    }
  });

  return {
    isLoading,
    keys: keysQuery.data ?? [],
    recentRequests: requestsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    usage: usageQuery.data ?? []
  };
};

export type { KeySummary, RecentRequest, Stats, UsageRow };
