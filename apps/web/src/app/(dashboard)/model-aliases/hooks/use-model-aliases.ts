import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface ModelAlias {
  readonly id: string;
  readonly alias: string;
  readonly targetModel: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const modelAliasesQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ModelAlias[]>("/v1/model-aliases"),
    queryKey: ["model-aliases"]
  });

interface CreateModelAliasInput {
  readonly alias: string;
  readonly targetModel: string;
}

export const useCreateModelAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModelAliasInput) =>
      api.post<ModelAlias>("/v1/model-aliases", input),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-aliases"] });
    }
  });
};

export const useDeleteModelAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/model-aliases/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-aliases"] });
    }
  });
};
