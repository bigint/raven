"use client";

import {
  queryOptions,
  useInfiniteQuery,
  useQuery
} from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { SessionRequest } from "@/app/(dashboard)/requests/hooks/use-logs";
import { sessionDetailQueryOptions } from "@/app/(dashboard)/requests/hooks/use-logs";
import { api } from "@/lib/api";
import type { DateRange } from "../lib/date-utils";
import {
  DATE_RANGE_OPTIONS,
  fillTimeSeriesGaps,
  keyFilter,
  rangeToFrom,
  VALID_RANGES
} from "../lib/date-utils";

export interface ToolDailyStats {
  readonly date: string;
  readonly totalRequests: number;
  readonly totalToolUses: number;
}

export interface ToolSession {
  readonly sessionId: string;
  readonly virtualKeyId: string;
  readonly keyName: string;
  readonly userAgent: string | null;
  readonly requestCount: number;
  readonly models: string[];
  readonly toolUses: number;
  readonly endTime: string;
}

interface ToolSessionsResponse {
  readonly data: ToolSession[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export type { DateRange };

const PAGE_SIZE = 20;

const toolStatsQueryOptions = (range: DateRange, keyId?: string) =>
  queryOptions({
    queryFn: async () => {
      const data = await api.get<ToolDailyStats[]>(
        `/v1/analytics/tools/stats?from=${rangeToFrom(range)}${keyFilter(keyId)}`
      );
      return fillTimeSeriesGaps(data, range, (date) => ({
        date,
        totalRequests: 0,
        totalToolUses: 0
      }));
    },
    queryKey: ["tools", "stats", { keyId, range }]
  });

export { type SessionRequest, sessionDetailQueryOptions };

export const useTools = (keyId?: string) => {
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

  const statsQuery = useQuery(toolStatsQueryOptions(dateRange, keyId));

  const sessionsQuery = useInfiniteQuery({
    getNextPageParam: (lastPage: ToolSessionsResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<ToolSessionsResponse>(
        `/v1/analytics/tools/sessions?from=${rangeToFrom(dateRange)}&page=${pageParam}&limit=${PAGE_SIZE}${keyFilter(keyId)}`
      ),
    queryKey: ["tools", "sessions", { keyId, range: dateRange }]
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
