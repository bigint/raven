import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ModelAlias {
  id: string;
  alias: string;
  targetModel: string;
  createdAt: string;
  updatedAt: string;
}

export const modelAliasesQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ModelAlias[]>("/v1/model-aliases"),
    queryKey: ["model-aliases"]
  });

interface CreateModelAliasInput {
  alias: string;
  targetModel: string;
}

export const useCreateModelAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModelAliasInput) =>
      api.post<ModelAlias>("/v1/model-aliases", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-aliases"] });
    }
  });
};

export const useDeleteModelAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/model-aliases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-aliases"] });
    }
  });
};
