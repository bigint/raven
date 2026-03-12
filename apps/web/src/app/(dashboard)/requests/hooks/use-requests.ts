import { queryOptions } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";
import { useOrgStore } from "@/stores/org";

export interface RequestLog {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  statusCode: number;
  latencyMs: number;
  cost: string;
  cacheHit: boolean;
}

export interface RequestsResponse {
  data: RequestLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const PROVIDER_FILTER_OPTIONS = [
  { label: "All Providers", value: "" },
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
  { label: "Azure", value: "azure" },
  { label: "Cohere", value: "cohere" },
  { label: "Mistral", value: "mistral" }
];

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  azure: "Azure",
  cohere: "Cohere",
  google: "Google",
  mistral: "Mistral",
  openai: "OpenAI"
};

export const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "2xx Success", value: "2xx" },
  { label: "4xx Client Error", value: "4xx" },
  { label: "5xx Server Error", value: "5xx" }
];

export type DateRange = "1h" | "24h" | "7d" | "30d";

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" }
];

export const PAGE_SIZE = 20;

const RANGE_MS: Record<DateRange, number> = {
  "1h": 3_600_000,
  "7d": 604_800_000,
  "24h": 86_400_000,
  "30d": 2_592_000_000
};

interface RequestsQueryParams {
  page: number;
  provider: string;
  status: string;
  range: DateRange;
}

export const requestsQueryOptions = (params: RequestsQueryParams) =>
  queryOptions({
    queryFn: () => {
      const now = new Date();
      const from = new Date(
        now.getTime() - RANGE_MS[params.range]
      ).toISOString();
      const searchParams = new URLSearchParams({
        from,
        limit: String(PAGE_SIZE),
        page: String(params.page)
      });
      if (params.provider) searchParams.set("provider", params.provider);
      if (params.status) {
        const codeMap: Record<string, string> = {
          "2xx": "200",
          "4xx": "400",
          "5xx": "500"
        };
        const code = codeMap[params.status];
        if (code) searchParams.set("statusCode", code);
      }
      return api.get<RequestsResponse>(
        `/v1/analytics/requests?${searchParams.toString()}`
      );
    },
    queryKey: ["requests", params]
  });

/** Custom hook for live SSE streaming of requests (DOM API: EventSource) */
export const useLiveRequests = (enabled: boolean) => {
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const orgId = getOrgId();
    const url = `${API_URL}/v1/analytics/requests/live${orgId ? `?orgId=${orgId}` : ""}`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("init", (e) => {
      const logs: RequestLog[] = JSON.parse(e.data);
      setRequests(logs);
      setTotal(logs.length);
      setIsLoading(false);
    });

    es.addEventListener("new", (e) => {
      const newLogs: RequestLog[] = JSON.parse(e.data);
      setRequests((prev) => {
        const merged = [...newLogs, ...prev];
        const seen = new Set<string>();
        return merged
          .filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          })
          .slice(0, 200);
      });
      setTotal((prev) => prev + newLogs.length);
    });

    es.addEventListener("error", () => {
      setError("Live connection lost. Reconnecting...");
      setIsLoading(false);
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [enabled]);

  return { error, isLoading, requests, total };
};
