"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CostBreakdown {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  breakdown: Array<{
    key: string;
    value: string;
    cost: number;
    requests: number;
    percentage: number;
  }>;
}

export interface CostForecast {
  period: string;
  currentSpend: number;
  projectedSpend: number;
  dailyRate: number;
  daysRemaining: number;
  projectedOverrun: boolean;
  projectedOverrunDate?: string;
  confidence: number;
}

export interface DailyCost {
  date: string;
  cost: number;
}

export const costByModelQueryOptions = (start?: string, end?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<CostBreakdown>(
        `/v1/finops/costs/models${start ? `?start=${start}&end=${end}` : ""}`
      ),
    queryKey: ["finops", "models", start, end]
  });

export const costByProviderQueryOptions = (start?: string, end?: string) =>
  queryOptions({
    queryFn: () =>
      api.get<CostBreakdown>(
        `/v1/finops/costs/providers${start ? `?start=${start}&end=${end}` : ""}`
      ),
    queryKey: ["finops", "providers", start, end]
  });

export const forecastQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CostForecast>("/v1/finops/costs/forecast"),
    queryKey: ["finops", "forecast"]
  });

export const dailyCostsQueryOptions = (days?: number) =>
  queryOptions({
    queryFn: () =>
      api.get<DailyCost[]>(
        `/v1/finops/costs/daily${days ? `?days=${days}` : ""}`
      ),
    queryKey: ["finops", "daily", days]
  });
