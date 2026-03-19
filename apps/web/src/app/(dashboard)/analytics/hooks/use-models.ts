"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export interface ModelRow {
  model: string;
  provider: string;
  requests: number;
  totalCost: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  avgLatencyMs: number;
  lastUsed: string | null;
}

export type DateRange = "7d" | "30d" | "90d";

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

export const modelsQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<ModelRow[]>(
        `/v1/analytics/models?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      ),
    queryKey: ["models", range, keyId]
  });

export const useModels = (keyId?: string) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const query = useQuery(modelsQueryOptions(dateRange, keyId));

  return {
    data: query.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: query.error?.message ?? null,
    isLoading: query.isPending,
    setDateRange
  };
};
