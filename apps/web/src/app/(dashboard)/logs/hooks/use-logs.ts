"use client";

import { queryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export interface LogSession {
  sessionId: string;
  virtualKeyId: string;
  keyName: string;
  userAgent: string | null;
  requestCount: number;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  toolUses: number;
  startTime: string;
  endTime: string;
}

export interface SessionRequest {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  statusCode: number;
  latencyMs: number;
  cost: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cacheHit: boolean;
  method: string;
  path: string;
  toolCount: number;
  toolNames: string[] | null;
  sessionId: string | null;
  userAgent: string | null;
  virtualKeyId: string;
}

interface LogsResponse {
  data: LogSession[];
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

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

const PAGE_SIZE = 20;

export const sessionDetailQueryOptions = (sessionId: string) =>
  queryOptions({
    enabled: !!sessionId,
    queryFn: () =>
      api.get<SessionRequest[]>(`/v1/analytics/sessions/${sessionId}`),
    queryKey: ["session", sessionId]
  });

export const useLogs = () => {
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

  const query = useInfiniteQuery({
    getNextPageParam: (lastPage: LogsResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<LogsResponse>(
        `/v1/analytics/logs?from=${rangeToFrom(dateRange)}&page=${pageParam}&limit=${PAGE_SIZE}`
      ),
    queryKey: ["logs", dateRange]
  });

  return {
    data: query.data?.pages.flatMap((p) => p.data) ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: query.error?.message ?? null,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isPending,
    setDateRange
  };
};
