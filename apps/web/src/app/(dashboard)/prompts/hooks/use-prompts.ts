import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PromptVersion {
  id: string;
  version: number;
  content: string;
  model: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Prompt {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeVersion?: PromptVersion;
  versions?: PromptVersion[];
}

export const promptsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Prompt[]>("/v1/prompts"),
    queryKey: ["prompts"]
  });

export const promptQueryOptions = (id: string) =>
  queryOptions({
    enabled: !!id,
    queryFn: () => api.get<Prompt>(`/v1/prompts/${id}`),
    queryKey: ["prompts", id]
  });

interface CreatePromptInput {
  name: string;
  content: string;
  model?: string;
}

export const useCreatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePromptInput) =>
      api.post<Prompt>("/v1/prompts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};

export const useUpdatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<Prompt>(`/v1/prompts/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};

export const useDeletePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/prompts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};

interface CreateVersionInput {
  promptId: string;
  content: string;
  model?: string;
}

export const useCreateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promptId, ...body }: CreateVersionInput) =>
      api.post<PromptVersion>(`/v1/prompts/${promptId}/versions`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["prompts", variables.promptId]
      });
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};

export const useActivateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      promptId,
      versionId
    }: {
      promptId: string;
      versionId: string;
    }) => api.put(`/v1/prompts/${promptId}/versions/${versionId}/activate`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["prompts", variables.promptId]
      });
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};
