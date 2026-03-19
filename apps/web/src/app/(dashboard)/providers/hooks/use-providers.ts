import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
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

interface ProviderModel {
  id: string;
  name: string;
  provider: string;
}

export const providersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Provider[]>("/v1/providers"),
    queryKey: ["providers"]
  });

export const providerModelsQueryOptions = (providerId: string) =>
  queryOptions({
    queryFn: () =>
      api.get<ProviderModel[]>(`/v1/providers/${providerId}/models`),
    queryKey: ["providers", providerId, "models"]
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
    onError: (err) => {
      toast.error(err.message);
    },
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
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
};

export const useDeleteProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/providers/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
};

interface TestProviderResult {
  success: boolean;
  message: string;
}

export const useTestProvider = () =>
  useMutation({
    mutationFn: (id: string) =>
      api.post<TestProviderResult>(`/v1/providers/${id}/test`),
    onError: (err) => {
      toast.error(err.message);
    }
  });
