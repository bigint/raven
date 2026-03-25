import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

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

const {
  useCreate: useCreateRoutingRule,
  useUpdate: useUpdateRoutingRule,
  useDelete: useDeleteRoutingRule
} = createCrudHooks<
  RoutingRule,
  RoutingRuleInput,
  RoutingRuleInput & { id: string }
>({
  endpoint: "/v1/routing-rules",
  labels: { plural: "Routing rules", singular: "Routing rule" },
  queryKey: ["routing-rules"]
});

export { useCreateRoutingRule, useDeleteRoutingRule, useUpdateRoutingRule };
