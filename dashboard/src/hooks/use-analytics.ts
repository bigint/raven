import { apiClient } from '@/lib/api'
import type { AnalyticsOpts, CacheData, CostData, LatencyData, UsageData } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'

const emptyUsage: UsageData = {
  total_requests: 0,
  total_tokens: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  requests_by_model: {},
  requests_by_provider: {},
  timeseries: [],
}

const emptyCost: CostData = {
  total_cost: 0,
  cost_by_provider: {},
  cost_by_model: {},
  cost_by_team: {},
  projected_monthly: 0,
  cache_savings: 0,
  timeseries: [],
}

const emptyLatency: LatencyData = {
  avg_latency_ms: 0,
  p50_latency_ms: 0,
  p95_latency_ms: 0,
  p99_latency_ms: 0,
  timeseries: [],
}

const emptyCache: CacheData = {
  hit_rate: 0,
  miss_rate: 0,
  total_hits: 0,
  total_misses: 0,
  storage_bytes: 0,
  savings: 0,
  timeseries: [],
}

export function useUsage(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'usage', opts],
    queryFn: () => apiClient.getUsage(opts),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30_000),
    retry: false,
    placeholderData: emptyUsage,
  })
}

export function useCost(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'cost', opts],
    queryFn: () => apiClient.getCost(opts),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30_000),
    retry: false,
    placeholderData: emptyCost,
  })
}

export function useLatency(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'latency', opts],
    queryFn: () => apiClient.getLatency(opts),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30_000),
    retry: false,
    placeholderData: emptyLatency,
  })
}

export function useCacheStats(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'cache', opts],
    queryFn: () => apiClient.getCacheStats(opts),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30_000),
    retry: false,
    placeholderData: emptyCache,
  })
}
