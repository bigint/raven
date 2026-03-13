"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { SessionRequest } from "@/app/(dashboard)/logs/hooks/use-logs";
import { sessionDetailQueryOptions } from "@/app/(dashboard)/logs/hooks/use-logs";
import { api } from "@/lib/api";

export interface ToolDailyStats {
  date: string;
  totalRequests: number;
  totalToolUses: number;
}

export interface ToolSession {
  sessionId: string;
  virtualKeyId: string;
  keyName: string;
  userAgent: string | null;
  requestCount: number;
  models: string[];
  toolUses: number;
  endTime: string;
}

interface ToolSessionsResponse {
  data: ToolSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

export const toolStatsQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<ToolDailyStats[]>(
        `/v1/analytics/tools/stats?from=${rangeToFrom(range)}`
      ),
    queryKey: ["tools", "stats", range]
  });

export const toolSessionsQueryOptions = (range: DateRange, page: number) =>
  queryOptions({
    queryFn: () =>
      api.get<ToolSessionsResponse>(
        `/v1/analytics/tools/sessions?from=${rangeToFrom(range)}&page=${page}&limit=20`
      ),
    queryKey: ["tools", "sessions", range, page]
  });

export { sessionDetailQueryOptions, type SessionRequest };

export const useTools = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10)) : 1;

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`?${params.toString()}`);
  };

  const statsQuery = useQuery(toolStatsQueryOptions(dateRange));
  const sessionsQuery = useQuery(toolSessionsQueryOptions(dateRange, page));

  return {
    chartData: statsQuery.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: statsQuery.error?.message ?? sessionsQuery.error?.message ?? null,
    isLoading: statsQuery.isPending || sessionsQuery.isPending,
    page,
    pagination: sessionsQuery.data?.pagination ?? null,
    sessions: sessionsQuery.data?.data ?? [],
    setDateRange,
    setPage
  };
};
