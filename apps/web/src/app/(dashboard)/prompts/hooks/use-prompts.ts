import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface PromptVersion {
  readonly id: string;
  readonly version: number;
  readonly content: string;
  readonly model: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
}

export interface Prompt {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly activeVersion?: PromptVersion;
  readonly versions?: PromptVersion[];
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
    queryKey: ["prompts", { id }]
  });

interface CreatePromptInput {
  readonly name: string;
  readonly content: string;
  readonly model?: string;
}

export const useCreatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePromptInput) =>
      api.post<Prompt>("/v1/prompts", input),
    onError: (err) => {
      toast.error(err.message);
    },
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
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};

export const useDeletePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/prompts/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};

interface CreateVersionInput {
  readonly promptId: string;
  readonly content: string;
  readonly model?: string;
}

export const useCreateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promptId, ...body }: CreateVersionInput) =>
      api.post<PromptVersion>(`/v1/prompts/${promptId}/versions`, body),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["prompts", { id: variables.promptId }]
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
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["prompts", { id: variables.promptId }]
      });
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });
};
