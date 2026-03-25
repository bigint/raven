import { queryOptions, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createCrudHooks } from "@/lib/crud-hooks";

export interface Webhook {
  readonly id: string;
  readonly url: string;
  readonly events: string[];
  readonly secret: string;
  readonly isEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const WEBHOOK_EVENTS = [
  "request.created",
  "budget.created",
  "budget.updated",
  "budget.deleted",
  "budget.alert",
  "guardrail.created",
  "guardrail.updated",
  "guardrail.deleted",
  "provider.created",
  "provider.updated",
  "provider.deleted",
  "key.created",
  "key.updated",
  "key.deleted",
  "settings.updated"
];

export const EVENT_CATEGORIES: Record<string, string[]> = {
  Budgets: [
    "budget.created",
    "budget.updated",
    "budget.deleted",
    "budget.alert"
  ],
  Guardrails: ["guardrail.created", "guardrail.updated", "guardrail.deleted"],
  Keys: ["key.created", "key.updated", "key.deleted"],
  Providers: ["provider.created", "provider.updated", "provider.deleted"],
  Requests: ["request.created"],
  Settings: ["settings.updated"]
};

export const webhooksQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Webhook[]>("/v1/webhooks"),
    queryKey: ["webhooks"]
  });

interface WebhookCreateInput {
  readonly url: string;
  readonly events: string[];
  readonly isEnabled?: boolean;
}

interface WebhookUpdateInput {
  readonly id: string;
  readonly url?: string;
  readonly events?: string[];
  readonly isEnabled?: boolean;
}

const {
  useCreate: useCreateWebhook,
  useUpdate: useUpdateWebhook,
  useDelete: useDeleteWebhook
} = createCrudHooks<Webhook, WebhookCreateInput, WebhookUpdateInput>({
  endpoint: "/v1/webhooks",
  labels: { plural: "Webhooks", singular: "Webhook" },
  queryKey: ["webhooks"]
});

export { useCreateWebhook, useDeleteWebhook, useUpdateWebhook };

interface TestWebhookResult {
  readonly ok: boolean;
  readonly status: number;
}

export const useTestWebhook = () =>
  useMutation({
    mutationFn: (url: string) =>
      api.post<TestWebhookResult>("/v1/webhooks/test", { url })
  });
