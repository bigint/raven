import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => apiClient.listProviders(),
    refetchInterval: 30_000,
  })
}

export function useProviderHealth(id: string) {
  return useQuery({
    queryKey: ['providers', id, 'health'],
    queryFn: () => apiClient.getProviderHealth(id),
    refetchInterval: 15_000,
    enabled: !!id,
  })
}
