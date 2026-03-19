"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { DateRange } from "../lib/date-utils";
import {
  DATE_RANGE_OPTIONS,
  keyFilter,
  rangeToFrom,
  VALID_RANGES
} from "../lib/date-utils";

export type { DateRange };

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

export const modelsQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<ModelRow[]>(
        `/v1/analytics/models?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      ),
    queryKey: ["models", { keyId, range }]
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
