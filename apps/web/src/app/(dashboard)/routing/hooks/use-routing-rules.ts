import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RoutingRule {
  id: string;
  name: string;
  sourceModel: string;
  targetModel: string;
  condition: string;
  conditionValue: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CONDITION_OPTIONS = [
  { label: "Token count below", value: "token_count_below" },
  { label: "Token count above", value: "token_count_above" },
  { label: "Message count below", value: "message_count_below" },
  { label: "Keyword match", value: "keyword_match" }
];

export const CONDITION_LABELS: Record<string, string> = {
  keyword_match: "Keyword Match",
  message_count_below: "Message Count Below",
  token_count_above: "Token Count Above",
  token_count_below: "Token Count Below"
};

export const routingRulesQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<RoutingRule[]>("/v1/routing-rules"),
    queryKey: ["routing-rules"]
  });

interface RoutingRuleInput {
  name: string;
  sourceModel: string;
  targetModel: string;
  condition: string;
  conditionValue: string;
  priority: number;
  isEnabled: boolean;
}

export const useCreateRoutingRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RoutingRuleInput) =>
      api.post<RoutingRule>("/v1/routing-rules", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });
};

export const useUpdateRoutingRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: RoutingRuleInput & { id: string }) =>
      api.put<RoutingRule>(`/v1/routing-rules/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });
};

export const useDeleteRoutingRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/routing-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });
};
