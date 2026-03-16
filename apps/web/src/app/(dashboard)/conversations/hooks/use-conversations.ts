"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tokenCount: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  model: string | null;
  messageCount: number;
  totalTokens: number;
  lastMessageAt: string | null;
  createdAt: string;
  messages?: ConversationMessage[];
}

export const conversationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Conversation[]>("/v1/conversations"),
    queryKey: ["conversations"]
  });

export const conversationQueryOptions = (id: string) =>
  queryOptions({
    enabled: !!id,
    queryFn: () => api.get<Conversation>(`/v1/conversations/${id}`),
    queryKey: ["conversations", id]
  });

export const useCreateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title?: string;
      model?: string;
      systemPrompt?: string;
    }) => api.post<Conversation>("/v1/conversations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] })
  });
};

export const useDeleteConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] })
  });
};

export const useCompactConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      strategy,
      maxTokens
    }: {
      id: string;
      strategy: string;
      maxTokens?: number;
    }) => api.post(`/v1/conversations/${id}/compact`, { maxTokens, strategy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] })
  });
};
