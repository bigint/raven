import { apiClient } from '@/lib/api'
import type { CreateProviderConfigInput, UpdateProviderConfigInput } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => apiClient.listProviders(),
    refetchInterval: 30_000,
    retry: false,
    placeholderData: [],
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

export function useCreateProviderConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProviderConfigInput) => apiClient.createProviderConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}

export function useUpdateProviderConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: UpdateProviderConfigInput }) =>
      apiClient.updateProviderConfig(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}

export function useDeleteProviderConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiClient.deleteProviderConfig(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}
