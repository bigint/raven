"use client";

import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export interface LogSession {
  sessionId: string;
  virtualKeyId: string;
  keyName: string;
  userAgent: string | null;
  requestCount: number;
  errorCount: number;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  toolUses: number;
  totalCost: number;
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
  isStarred: boolean;
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

export type DateRange = "7d" | "30d" | "90d" | "custom";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" }
];

const RANGE_MS: Record<string, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d", "custom"];

const rangeToFrom = (range: string): string => {
  const ms = RANGE_MS[range] ?? 2_592_000_000;
  return new Date(Date.now() - ms).toISOString();
};

const DEFAULT_PAGE_SIZE = 20;

export const sessionDetailQueryOptions = (sessionId: string) =>
  queryOptions({
    enabled: !!sessionId,
    queryFn: () =>
      api.get<SessionRequest[]>(`/v1/analytics/sessions/${sessionId}`),
    queryKey: ["session", { sessionId }]
  });

export const useToggleStar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ isStarred: boolean }>(`/v1/analytics/requests/${id}/star`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
};

export const useLogs = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const setCustomRange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
  };

  const buildQueryUrl = (pageParam: number): string => {
    if (dateRange === "custom" && customFrom && customTo) {
      const from = new Date(customFrom).toISOString();
      const to = new Date(`${customTo}T23:59:59`).toISOString();
      return `/v1/analytics/logs?from=${from}&to=${to}&page=${pageParam}&limit=${pageSize}`;
    }

    const fromDate =
      dateRange === "custom" ? rangeToFrom("30d") : rangeToFrom(dateRange);
    return `/v1/analytics/logs?from=${fromDate}&page=${pageParam}&limit=${pageSize}`;
  };

  const query = useInfiniteQuery({
    enabled: dateRange !== "custom" || (!!customFrom && !!customTo),
    getNextPageParam: (lastPage: LogsResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<LogsResponse>(buildQueryUrl(pageParam as number)),
    queryKey: ["logs", { customFrom, customTo, pageSize, range: dateRange }]
  });

  return {
    customFrom,
    customTo,
    data: query.data?.pages.flatMap((p) => p.data) ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: query.error?.message ?? null,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isPending,
    pageSize,
    setCustomRange,
    setDateRange,
    setPageSize
  };
};
