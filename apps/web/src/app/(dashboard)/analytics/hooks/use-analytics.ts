"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEventStream } from "@/hooks/use-event-stream";
import { api } from "@/lib/api";

interface Stats {
  totalRequests: number;
  totalCost: string;
  avgLatencyMs: string;
  cacheHitRate: string;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  totalReasoningTokens: number;
}

interface UsageRow {
  provider: string;
  providerConfigName: string | null;
  model: string;
  totalRequests: number;
  totalCost: string;
  totalInputTokens: string;
  totalOutputTokens: string;
  totalCachedTokens: string;
  totalReasoningTokens: string;
  avgLatencyMs: string;
}

interface CacheDailyRow {
  date: string;
  hits: number;
  misses: number;
  total: number;
}

interface CacheStats {
  cacheHits: number;
  cacheMisses: number;
  daily: CacheDailyRow[];
  hitRate: string;
  totalRequests: number;
}

type DateRange = "7d" | "30d" | "90d";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

export const analyticsStatsQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<Stats>(`/v1/analytics/stats?from=${rangeToFrom(range)}`),
    queryKey: ["analytics", "stats", range]
  });

export const analyticsUsageQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<UsageRow[]>(`/v1/analytics/usage?from=${rangeToFrom(range)}`),
    queryKey: ["analytics", "usage", range]
  });

export const analyticsCacheQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<CacheStats>(`/v1/analytics/cache?from=${rangeToFrom(range)}`),
    queryKey: ["analytics", "cache", range]
  });

export const useAnalytics = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const statsQuery = useQuery(analyticsStatsQueryOptions(dateRange));
  const usageQuery = useQuery(analyticsUsageQueryOptions(dateRange));
  const cacheQuery = useQuery(analyticsCacheQueryOptions(dateRange));

  const isLoading =
    statsQuery.isPending || usageQuery.isPending || cacheQuery.isPending;
  const error =
    statsQuery.error?.message ??
    usageQuery.error?.message ??
    cacheQuery.error?.message ??
    null;

  useEventStream({
    enabled: !isLoading,
    events: ["request.created"],
    onEvent: (data) => {
      const req = data as { provider: string; model: string; cost: string };
      queryClient.setQueryData<Stats>(
        ["analytics", "stats", dateRange],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalCost: (Number(prev.totalCost) + Number(req.cost)).toString(),
            totalRequests: prev.totalRequests + 1
          };
        }
      );
      queryClient.setQueryData<UsageRow[]>(
        ["analytics", "usage", dateRange],
        (prev) =>
          prev?.map((row) =>
            row.provider === req.provider && row.model === req.model
              ? {
                  ...row,
                  totalCost: (
                    Number(row.totalCost) + Number(req.cost)
                  ).toString(),
                  totalRequests: row.totalRequests + 1
                }
              : row
          )
      );
    }
  });

  return {
    cache: cacheQuery.data ?? null,
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error,
    isLoading,
    setDateRange,
    stats: statsQuery.data ?? null,
    usage: usageQuery.data ?? []
  };
};

export type { CacheDailyRow, CacheStats, DateRange, Stats, UsageRow };
