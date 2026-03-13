"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

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

export type DateRange = "7d" | "30d" | "90d";
export type GroupBy = "key" | "model";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { label: "Keys", value: "key" },
  { label: "Models", value: "model" }
];

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

export const adoptionChartQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<{ data: ChartDataPoint[] }>(
        `/v1/analytics/adoption/chart?from=${rangeToFrom(range)}`
      ),
    queryKey: ["adoption", "chart", range]
  });

export const adoptionBreakdownQueryOptions = (
  range: DateRange,
  groupBy: GroupBy
) =>
  queryOptions({
    queryFn: () =>
      api.get<{ data: BreakdownRow[] }>(
        `/v1/analytics/adoption/breakdown?from=${rangeToFrom(range)}&groupBy=${groupBy}`
      ),
    queryKey: ["adoption", "breakdown", range, groupBy]
  });

export const useAdoption = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const groupByParam = searchParams.get("groupBy") as GroupBy | null;
  const groupBy =
    groupByParam === "key" || groupByParam === "model" ? groupByParam : "key";

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

  const chartQuery = useQuery(adoptionChartQueryOptions(dateRange));
  const breakdownQuery = useQuery(
    adoptionBreakdownQueryOptions(dateRange, groupBy)
  );

  return {
    breakdownData: breakdownQuery.data?.data ?? [],
    chartData: chartQuery.data?.data ?? [],
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
