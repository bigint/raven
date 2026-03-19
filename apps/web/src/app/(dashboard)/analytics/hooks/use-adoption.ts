"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { DateRange } from "../lib/date-utils";
import {
  DATE_RANGE_OPTIONS,
  fillTimeSeriesGaps,
  keyFilter,
  rangeToFrom,
  VALID_RANGES
} from "../lib/date-utils";

export interface ChartDataPoint {
  date: string;
  cached: number;
  input: number;
  output: number;
  reasoning: number;
}

export interface BreakdownRow {
  label: string;
  cachedTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  requests: number;
}

export type { DateRange };
export type GroupBy = "key" | "model" | "userAgent";

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { label: "Keys", value: "key" },
  { label: "Models", value: "model" },
  { label: "User Agents", value: "userAgent" }
];

export const adoptionChartQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: async () => {
      const data = await api.get<ChartDataPoint[]>(
        `/v1/analytics/adoption/chart?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      );
      return fillTimeSeriesGaps(data, range, (date) => ({
        cached: 0,
        date,
        input: 0,
        output: 0,
        reasoning: 0
      }));
    },
    queryKey: ["adoption", "chart", { keyId, range }]
  });

export const adoptionBreakdownQueryOptions = (
  range: DateRange,
  groupBy: GroupBy,
  keyId?: string
) =>
  queryOptions({
    queryFn: () =>
      api.get<BreakdownRow[]>(
        `/v1/analytics/adoption/breakdown?from=${rangeToFrom(range)}&groupBy=${groupBy}${keyFilter(keyId)}`
      ),
    queryKey: ["adoption", "breakdown", { groupBy, keyId, range }]
  });

export const useAdoption = (keyId?: string) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const groupByParam = searchParams.get("groupBy") as GroupBy | null;
  const groupBy =
    groupByParam === "key" ||
    groupByParam === "model" ||
    groupByParam === "userAgent"
      ? groupByParam
      : "key";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const setGroupBy = (gb: GroupBy) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("groupBy", gb);
    router.replace(`?${params.toString()}`);
  };

  const chartQuery = useQuery(adoptionChartQueryOptions(dateRange, keyId));
  const breakdownQuery = useQuery(
    adoptionBreakdownQueryOptions(dateRange, groupBy, keyId)
  );

  return {
    breakdownData: breakdownQuery.data ?? [],
    chartData: chartQuery.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: chartQuery.error?.message ?? breakdownQuery.error?.message ?? null,
    groupBy,
    groupByOptions: GROUP_BY_OPTIONS,
    isLoading: chartQuery.isPending || breakdownQuery.isPending,
    setDateRange,
    setGroupBy
  };
};
