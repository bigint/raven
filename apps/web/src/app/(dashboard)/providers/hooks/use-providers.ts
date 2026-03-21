import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  readonly success: boolean;
  readonly message: string;
}

export const useTestProvider = () =>
  useMutation({
    mutationFn: (id: string) =>
      api.post<TestProviderResult>(`/v1/providers/${id}/test`),
    onError: (err) => {
      toast.error(err.message);
    }
  });
