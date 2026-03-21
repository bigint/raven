import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface RoutingRule {
  readonly id: string;
  readonly name: string;
  readonly sourceModel: string;
  readonly targetModel: string;
  readonly condition: string;
  readonly conditionValue: string;
  readonly priority: number;
  readonly isEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly name: string;
  readonly sourceModel: string;
  readonly targetModel: string;
  readonly condition: string;
  readonly conditionValue: string;
  readonly priority: number;
  readonly isEnabled: boolean;
}

export const useCreateRoutingRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RoutingRuleInput) => {
      const promise = api.post<RoutingRule>("/v1/routing-rules", input);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Creating routing rule...",
        success: "Routing rule created"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });
};

export const useUpdateRoutingRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: RoutingRuleInput & { id: string }) => {
      const promise = api.put<RoutingRule>(`/v1/routing-rules/${id}`, body);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating routing rule...",
        success: "Routing rule updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });
};

export const useDeleteRoutingRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/routing-rules/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting routing rule...",
        success: "Routing rule deleted"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });
};
