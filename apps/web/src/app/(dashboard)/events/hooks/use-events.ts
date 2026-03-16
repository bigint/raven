"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RavenEvent {
  id: string;
  type: string;
  organizationId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const eventsQueryOptions = (type?: string, limit?: number) =>
  queryOptions({
    queryFn: () =>
      api.get<RavenEvent[]>(
        `/v1/events${type ? `?type=${type}&limit=${limit ?? 50}` : `?limit=${limit ?? 50}`}`
      ),
    queryKey: ["events", type, limit],
    refetchInterval: 10000
  });
