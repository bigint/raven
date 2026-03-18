"use client";

import type { Plan } from "@raven/types";
import { PLAN_FEATURES } from "@raven/types";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { subscriptionQueryOptions } from "@/app/(dashboard)/billing/hooks/use-billing";
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

const RANGE_DAYS: Record<DateRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90
};

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

const keyFilter = (keyId?: string): string =>
  keyId ? `&virtualKeyId=${keyId}` : "";

export const analyticsStatsQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<Stats>(
        `/v1/analytics/stats?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      ),
    queryKey: ["analytics", "stats", range, keyId]
  });

export const analyticsUsageQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<UsageRow[]>(
        `/v1/analytics/usage?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      ),
    queryKey: ["analytics", "usage", range, keyId]
  });

export const analyticsCacheQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<CacheStats>(
        `/v1/analytics/cache?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      ),
    queryKey: ["analytics", "cache", range, keyId]
  });

const POLL_INTERVAL = 30_000;

export const useAnalytics = (keyId?: string) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const subscriptionQuery = useQuery(subscriptionQueryOptions());
  const currentPlan = (subscriptionQuery.data?.planId as Plan) ?? "free";
  const retentionDays = PLAN_FEATURES[currentPlan].analyticsRetentionDays;

  const rangeParam = searchParams.get("range") as DateRange | null;
  const maxAllowedRange =
    VALID_RANGES.filter((r) => RANGE_DAYS[r] <= retentionDays).pop() ?? "7d";
  const dateRange =
    rangeParam &&
    VALID_RANGES.includes(rangeParam) &&
    RANGE_DAYS[rangeParam] <= retentionDays
      ? rangeParam
      : maxAllowedRange;

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const dateRangeOptions = DATE_RANGE_OPTIONS.map((opt) => {
    const days = RANGE_DAYS[opt.value];
    const allowed = days <= retentionDays;
    return {
      ...opt,
      disabled: !allowed,
      tooltip: allowed
        ? undefined
        : `Upgrade to access ${opt.label.toLowerCase()} analytics`
    };
  });

  const statsQuery = useQuery({
    ...analyticsStatsQueryOptions(dateRange, keyId),
    refetchInterval: POLL_INTERVAL
  });
  const usageQuery = useQuery({
    ...analyticsUsageQueryOptions(dateRange, keyId),
    refetchInterval: POLL_INTERVAL
  });
  const cacheQuery = useQuery({
    ...analyticsCacheQueryOptions(dateRange, keyId),
    refetchInterval: POLL_INTERVAL
  });

  const isLoading =
    statsQuery.isPending || usageQuery.isPending || cacheQuery.isPending;
  const error =
    statsQuery.error?.message ??
    usageQuery.error?.message ??
    cacheQuery.error?.message ??
    null;

  return {
    cache: cacheQuery.data ?? null,
    dateRange,
    dateRangeOptions,
    error,
    isLoading,
    setDateRange,
    stats: statsQuery.data ?? null,
    usage: usageQuery.data ?? []
  };
};

export type { CacheDailyRow, CacheStats, DateRange, Stats, UsageRow };
