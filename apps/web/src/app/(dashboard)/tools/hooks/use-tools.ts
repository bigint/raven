"use client";

import { queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

const PAGE_SIZE = 20;

const fillToolGaps = (
  data: ToolDailyStats[],
  range: DateRange
): ToolDailyStats[] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(Date.now() - RANGE_MS[range]);
  from.setHours(0, 0, 0, 0);

  const dataMap = new Map(data.map((d) => [d.date, d]));
  const result: ToolDailyStats[] = [];
  const current = new Date(from);

  while (current <= now) {
    const key = current.toISOString().slice(0, 10);
    result.push(
      dataMap.get(key) ?? { date: key, totalRequests: 0, totalToolUses: 0 }
    );
    current.setDate(current.getDate() + 1);
  }

  return result;
};

export const toolStatsQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: async () => {
      const data = await api.get<ToolDailyStats[]>(
        `/v1/analytics/tools/stats?from=${rangeToFrom(range)}`
      );
      return fillToolGaps(data, range);
    },
    queryKey: ["tools", "stats", range]
  });

export { type SessionRequest, sessionDetailQueryOptions };

export const useTools = () => {
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

  const statsQuery = useQuery(toolStatsQueryOptions(dateRange));

  const sessionsQuery = useInfiniteQuery({
    getNextPageParam: (lastPage: ToolSessionsResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<ToolSessionsResponse>(
        `/v1/analytics/tools/sessions?from=${rangeToFrom(dateRange)}&page=${pageParam}&limit=${PAGE_SIZE}`
      ),
    queryKey: ["tools", "sessions", dateRange]
  });

  return {
    chartData: statsQuery.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: statsQuery.error?.message ?? sessionsQuery.error?.message ?? null,
    fetchNextPage: sessionsQuery.fetchNextPage,
    hasNextPage: sessionsQuery.hasNextPage,
    isFetchingNextPage: sessionsQuery.isFetchingNextPage,
    isLoading: statsQuery.isPending || sessionsQuery.isPending,
    sessions: sessionsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    setDateRange
  };
};
