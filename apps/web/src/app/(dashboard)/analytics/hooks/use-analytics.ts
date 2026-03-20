"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ExtendedDateRange } from "../lib/date-utils";
import {
  EXTENDED_DATE_RANGE_OPTIONS,
  EXTENDED_VALID_RANGES,
  extendedRangeToFrom,
  keyFilter
} from "../lib/date-utils";

interface Stats {
  readonly totalRequests: number;
  readonly totalCost: string;
  readonly avgLatencyMs: string;
  readonly cacheHitRate: string;
  readonly totalTokens: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCachedTokens: number;
  readonly totalReasoningTokens: number;
}

interface UsageRow {
  readonly provider: string;
  readonly providerConfigName: string | null;
  readonly model: string;
  readonly totalRequests: number;
  readonly totalCost: string;
  readonly totalInputTokens: string;
  readonly totalOutputTokens: string;
  readonly totalCachedTokens: string;
  readonly totalReasoningTokens: string;
  readonly avgLatencyMs: string;
}

interface CacheDailyRow {
  readonly date: string;
  readonly hits: number;
  readonly misses: number;
  readonly total: number;
}

interface CacheStats {
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly daily: CacheDailyRow[];
  readonly hitRate: string;
  readonly totalRequests: number;
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
  const [customFrom, setCustomFrom] = useState<string>(
    () => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  );
  const [customTo, setCustomTo] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && EXTENDED_VALID_RANGES.includes(rangeParam)
      ? rangeParam
      : "30d";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const setCustomRange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
  };

  const dateRangeOptions = EXTENDED_DATE_RANGE_OPTIONS;

  const isCustomReady = dateRange !== "custom" || (!!customFrom && !!customTo);

  const stats = useQuery({
    ...analyticsStatsQueryOptions(dateRange, keyId, customFrom, customTo),
    enabled: isCustomReady,
    refetchInterval: POLL_INTERVAL
  });
  const usage = useQuery({
    ...analyticsUsageQueryOptions(dateRange, keyId, customFrom, customTo),
    enabled: isCustomReady,
    refetchInterval: POLL_INTERVAL
  });
  const cache = useQuery({
    ...analyticsCacheQueryOptions(dateRange, keyId, customFrom, customTo),
    enabled: isCustomReady,
    refetchInterval: POLL_INTERVAL
  });

  return {
    cache,
    customFrom,
    customTo,
    dateRange,
    dateRangeOptions,
    setCustomRange,
    setDateRange,
    stats,
    usage
  };
};

export type { CacheDailyRow, CacheStats, DateRange, Stats, UsageRow };
