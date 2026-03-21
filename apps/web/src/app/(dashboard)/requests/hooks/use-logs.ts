"use client";

import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { ExtendedDateRange } from "@/app/(dashboard)/analytics/lib/date-utils";
import {
  EXTENDED_DATE_RANGE_OPTIONS,
  EXTENDED_VALID_RANGES,
  extendedRangeToFrom
} from "@/app/(dashboard)/analytics/lib/date-utils";
import { api } from "@/lib/api";

export interface LogSession {
  readonly sessionId: string;
  readonly virtualKeyId: string;
  readonly keyName: string;
  readonly userAgent: string | null;
  readonly requestCount: number;
  readonly errorCount: number;
  readonly models: string[];
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly toolUses: number;
  readonly totalCost: number;
  readonly startTime: string;
  readonly endTime: string;
}

export interface SessionRequest {
  readonly id: string;
  readonly createdAt: string;
  readonly provider: string;
  readonly model: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly cost: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly cacheHit: boolean;
  readonly method: string;
  readonly path: string;
  readonly toolCount: number;
  readonly toolNames: string[] | null;
  readonly sessionId: string | null;
  readonly userAgent: string | null;
  readonly isStarred: boolean;
  readonly virtualKeyId: string;
}

interface LogsResponse {
  readonly data: LogSession[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export type DateRange = ExtendedDateRange;

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
    mutationFn: (id: string) => {
      const promise = api.patch<{ isStarred: boolean }>(
        `/v1/analytics/requests/${id}/star`
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating...",
        success: "Star toggled"
      });
      return promise;
    },
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
    rangeParam && EXTENDED_VALID_RANGES.includes(rangeParam)
      ? rangeParam
      : "30d";

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
      dateRange === "custom"
        ? extendedRangeToFrom("30d")
        : extendedRangeToFrom(dateRange);
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
    dateRangeOptions: EXTENDED_DATE_RANGE_OPTIONS,
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
