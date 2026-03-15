import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AvailableProvider {
  slug: string;
  name: string;
}

export const availableProvidersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AvailableProvider[]>("/v1/providers/available"),
    queryKey: ["providers", "available"]
  });

export const useAvailableProviders = () =>
  useQuery(availableProvidersQueryOptions());

export interface Provider {
  id: string;
  provider: string;
  name: string | null;
  apiKey: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const providersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Provider[]>("/v1/providers"),
    queryKey: ["providers"]
  });

interface CreateProviderInput {
  provider: string;
  name?: string;
  apiKey: string;
  isEnabled: boolean;
}

interface UpdateProviderInput {
  id: string;
  name?: string;
  apiKey?: string;
  isEnabled?: boolean;
}

export const useCreateProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProviderInput) =>
      api.post<Provider>("/v1/providers", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
};

export const useUpdateProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateProviderInput) =>
      api.put<Provider>(`/v1/providers/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
};

export const useDeleteProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
};
