import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  "team.created",
  "team.updated",
  "team.deleted",
  "settings.updated",
  "subscription.updated"
];

export const EVENT_CATEGORIES: Record<string, string[]> = {
  Billing: ["subscription.updated"],
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
  Settings: ["settings.updated"],
  Teams: ["team.created", "team.updated", "team.deleted"]
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

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WebhookCreateInput) =>
      api.post<Webhook>("/v1/webhooks", input),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    }
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: WebhookUpdateInput) =>
      api.put<Webhook>(`/v1/webhooks/${id}`, body),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    }
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/webhooks/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    }
  });
};

interface TestWebhookResult {
  readonly ok: boolean;
  readonly status: number;
}

export const useTestWebhook = () =>
  useMutation({
    mutationFn: (url: string) =>
      api.post<TestWebhookResult>("/v1/webhooks/test", { url }),
    onError: (err) => {
      toast.error(err.message);
    }
  });
