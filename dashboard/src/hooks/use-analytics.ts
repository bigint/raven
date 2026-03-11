import { apiClient } from '@/lib/api'
import type { AnalyticsOpts } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'

export function useUsage(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'usage', opts],
    queryFn: () => apiClient.getUsage(opts),
    refetchInterval: 30_000,
  })
}

export function useCost(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'cost', opts],
    queryFn: () => apiClient.getCost(opts),
    refetchInterval: 30_000,
  })
}

export function useLatency(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'latency', opts],
    queryFn: () => apiClient.getLatency(opts),
    refetchInterval: 30_000,
  })
}

export function useCacheStats(opts: AnalyticsOpts) {
  return useQuery({
    queryKey: ['analytics', 'cache', opts],
    queryFn: () => apiClient.getCacheStats(opts),
    refetchInterval: 30_000,
  })
}
