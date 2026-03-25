import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

export interface AvailableProvider {
  readonly slug: string;
  readonly name: string;
}

export const availableProvidersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AvailableProvider[]>("/v1/providers/available"),
    queryKey: ["providers", "available"]
  });

export const useAvailableProviders = () =>
  useQuery(availableProvidersQueryOptions());

export interface Provider {
  readonly id: string;
  readonly provider: string;
  readonly name: string | null;
  readonly apiKey: string;
  readonly isEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const providersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Provider[]>("/v1/providers"),
    queryKey: ["providers"]
  });

interface CreateProviderInput {
  readonly provider: string;
  readonly name?: string;
  readonly apiKey: string;
  readonly isEnabled: boolean;
}

interface UpdateProviderInput {
  readonly id: string;
  readonly name?: string;
  readonly apiKey?: string;
  readonly isEnabled?: boolean;
}

const {
  useCreate: useCreateProvider,
  useUpdate: useUpdateProvider,
  useDelete: useDeleteProvider
} = createCrudHooks<Provider, CreateProviderInput, UpdateProviderInput>({
  endpoint: "/v1/providers",
  labels: { plural: "Providers", singular: "Provider" },
  queryKey: ["providers"]
});

export { useCreateProvider, useDeleteProvider, useUpdateProvider };

interface TestProviderResult {
  readonly success: boolean;
  readonly message: string;
}

export const useTestProvider = () =>
  useMutation({
    mutationFn: (id: string) =>
      api.post<TestProviderResult>(`/v1/providers/${id}/test`)
  });
