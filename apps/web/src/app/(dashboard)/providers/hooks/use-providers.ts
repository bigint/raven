import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Provider {
  id: string;
  provider: string;
  name: string | null;
  apiKey: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PROVIDER_OPTIONS = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
  { label: "Azure", value: "azure" },
  { label: "Cohere", value: "cohere" },
  { label: "Mistral", value: "mistral" }
];

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  azure: "Azure",
  cohere: "Cohere",
  google: "Google",
  mistral: "Mistral",
  openai: "OpenAI"
};

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
