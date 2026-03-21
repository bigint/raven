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

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WebhookCreateInput) => {
      const promise = api.post<Webhook>("/v1/webhooks", input);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Creating webhook...",
        success: "Webhook created"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    }
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: WebhookUpdateInput) => {
      const promise = api.put<Webhook>(`/v1/webhooks/${id}`, body);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating webhook...",
        success: "Webhook updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    }
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/webhooks/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting webhook...",
        success: "Webhook deleted"
      });
      return promise;
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
      api.post<TestWebhookResult>("/v1/webhooks/test", { url })
  });
