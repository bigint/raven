"use client";

import type { Message } from "@raven/sdk";
import { RavenClient } from "@raven/sdk";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";

interface DisplayMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

export interface CatalogModel {
  id: string;
  slug: string;
  name: string;
  provider: string;
}

interface PlaygroundKey {
  id: string;
  key: string;
}

export const catalogModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CatalogModel[]>("/v1/models"),
    queryKey: ["catalog-models"]
  });

export const useChat = () => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<{
    model: string;
    provider: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef<PlaygroundKey | null>(null);
  const clientRef = useRef<RavenClient | null>(null);
  const queryClient = useQueryClient();

  const ensureKey = async (): Promise<PlaygroundKey> => {
    if (keyRef.current) return keyRef.current;
    const result = await api.post<PlaygroundKey>("/v1/keys", {
      environment: "test",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      name: `Playground ${new Date().toLocaleTimeString()}`
    });
    const pk = { id: result.id, key: result.key };
    keyRef.current = pk;
    clientRef.current = new RavenClient({
      apiKey: pk.key,
      baseUrl: API_URL,
      headers: { "x-session-id": crypto.randomUUID() }
    });
    return pk;
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !selectedModel || isStreaming) return;

      const userMessage: DisplayMessage = {
        content: content.trim(),
        id: crypto.randomUUID(),
        role: "user"
      };

      const assistantMessage: DisplayMessage = {
        content: "",
        id: crypto.randomUUID(),
        role: "assistant"
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        await ensureKey();

        const client = clientRef.current;
        if (!client) return;

        const chatMessages: Message[] = [...messages, userMessage].map((m) => ({
          content: m.content,
          role: m.role
        }));

        const stream = await client.streamText(
          {
            messages: chatMessages,
            model: selectedModel.model,
            provider: selectedModel.provider
          },
          abortController.signal
        );

        for await (const delta of stream) {
          setMessages((prev) => {
            const idx = prev.length - 1;
            const msg = prev[idx];
            if (!msg || msg.id !== assistantMessage.id) return prev;
            const updated = [...prev];
            updated[idx] = { ...msg, content: msg.content + delta };
            return updated;
          });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: `Error: ${(error as Error).message}` }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedModel, messages, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    const currentKey = keyRef.current;
    if (currentKey) {
      api.delete(`/v1/keys/${currentKey.id}`).then(() => {
        queryClient.invalidateQueries({ queryKey: ["keys"] });
      });
      keyRef.current = null;
      clientRef.current = null;
    }
  }, [queryClient]);

  return {
    clearMessages,
    isStreaming,
    messages,
    selectedModel,
    sendMessage,
    setSelectedModel,
    stopStreaming
  };
};
