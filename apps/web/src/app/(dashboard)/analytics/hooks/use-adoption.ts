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
export type GroupBy = "key" | "model" | "userAgent";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { label: "Keys", value: "key" },
  { label: "Models", value: "model" },
  { label: "User Agents", value: "userAgent" }
];

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

const fillChartGaps = (
  data: ChartDataPoint[],
  range: DateRange
): ChartDataPoint[] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(Date.now() - RANGE_MS[range]);
  from.setHours(0, 0, 0, 0);

  const dataMap = new Map(data.map((d) => [d.date, d]));
  const result: ChartDataPoint[] = [];
  const current = new Date(from);

  while (current <= now) {
    const key = current.toISOString().slice(0, 10);
    result.push(
      dataMap.get(key) ?? {
        cached: 0,
        date: key,
        input: 0,
        output: 0,
        reasoning: 0
      }
    );
    current.setDate(current.getDate() + 1);
  }

  return result;
};

const keyFilter = (keyId?: string): string =>
  keyId ? `&virtualKeyId=${keyId}` : "";

export const adoptionChartQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: async () => {
      const data = await api.get<ChartDataPoint[]>(
        `/v1/analytics/adoption/chart?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      );
      return fillChartGaps(data, range);
    },
    queryKey: ["adoption", "chart", range, keyId]
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
    queryKey: ["adoption", "breakdown", range, groupBy, keyId]
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
