"use client";

import type { Plan } from "@raven/types";
import { PLAN_FEATURES } from "@raven/types";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { subscriptionQueryOptions } from "@/app/(dashboard)/billing/hooks/use-billing";
import { api } from "@/lib/api";
import type { ExtendedDateRange } from "../lib/date-utils";
import {
  EXTENDED_DATE_RANGE_OPTIONS,
  EXTENDED_VALID_RANGES,
  extendedRangeToFrom,
  keyFilter,
  RANGE_DAYS
} from "../lib/date-utils";

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

type DateRange = ExtendedDateRange;

const buildDateParams = (
  range: DateRange,
  customFrom?: string,
  customTo?: string
): string => {
  if (range === "custom" && customFrom && customTo) {
    const from = new Date(customFrom).toISOString();
    const to = new Date(`${customTo}T23:59:59`).toISOString();
    return `from=${from}&to=${to}`;
  }
  return `from=${extendedRangeToFrom(range)}`;
};

export const analyticsStatsQueryOptions = (
  range: DateRange,
  keyId?: string,
  customFrom?: string,
  customTo?: string
) =>
  queryOptions({
    queryFn: () =>
      api.get<Stats>(
        `/v1/analytics/stats?${buildDateParams(range, customFrom, customTo)}${keyFilter(keyId)}`
      ),
    queryKey: ["analytics", "stats", { customFrom, customTo, keyId, range }]
  });

export const analyticsUsageQueryOptions = (
  range: DateRange,
  keyId?: string,
  customFrom?: string,
  customTo?: string
) =>
  queryOptions({
    queryFn: () =>
      api.get<UsageRow[]>(
        `/v1/analytics/usage?${buildDateParams(range, customFrom, customTo)}${keyFilter(keyId)}`
      ),
    queryKey: ["analytics", "usage", { customFrom, customTo, keyId, range }]
  });

export const analyticsCacheQueryOptions = (
  range: DateRange,
  keyId?: string,
  customFrom?: string,
  customTo?: string
) =>
  queryOptions({
    queryFn: () =>
      api.get<CacheStats>(
        `/v1/analytics/cache?${buildDateParams(range, customFrom, customTo)}${keyFilter(keyId)}`
      ),
    queryKey: ["analytics", "cache", { customFrom, customTo, keyId, range }]
  });

const POLL_INTERVAL = 30_000;

export const useAnalytics = (keyId?: string) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const subscriptionQuery = useQuery(subscriptionQueryOptions());
  const currentPlan = (subscriptionQuery.data?.planId as Plan) ?? "free";
  const retentionDays = PLAN_FEATURES[currentPlan].analyticsRetentionDays;

  const rangeParam = searchParams.get("range") as DateRange | null;
  const maxAllowedRange =
    EXTENDED_VALID_RANGES.filter(
      (r) => r === "custom" || (RANGE_DAYS[r] ?? 0) <= retentionDays
    ).pop() ?? "7d";
  const dateRange =
    rangeParam &&
    EXTENDED_VALID_RANGES.includes(rangeParam) &&
    (rangeParam === "custom" || (RANGE_DAYS[rangeParam] ?? 0) <= retentionDays)
      ? rangeParam
      : maxAllowedRange;

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const setCustomRange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
  };

  const dateRangeOptions = EXTENDED_DATE_RANGE_OPTIONS.map((opt) => {
    if (opt.value === "custom") return opt;
    const days = RANGE_DAYS[opt.value] ?? 0;
    const allowed = days <= retentionDays;
    return {
      ...opt,
      disabled: !allowed,
      tooltip: allowed
        ? undefined
        : `Upgrade to access ${opt.label.toLowerCase()} analytics`
    };
  });

  const isCustomReady = dateRange !== "custom" || (!!customFrom && !!customTo);

  const statsQuery = useQuery({
    ...analyticsStatsQueryOptions(dateRange, keyId, customFrom, customTo),
    enabled: isCustomReady,
    refetchInterval: POLL_INTERVAL
  });
  const usageQuery = useQuery({
    ...analyticsUsageQueryOptions(dateRange, keyId, customFrom, customTo),
    enabled: isCustomReady,
    refetchInterval: POLL_INTERVAL
  });
  const cacheQuery = useQuery({
    ...analyticsCacheQueryOptions(dateRange, keyId, customFrom, customTo),
    enabled: isCustomReady,
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
    customFrom,
    customTo,
    dateRange,
    dateRangeOptions,
    error,
    isLoading,
    setCustomRange,
    setDateRange,
    stats: statsQuery.data ?? null,
    usage: usageQuery.data ?? []
  };
};

export type { CacheDailyRow, CacheStats, DateRange, Stats, UsageRow };
