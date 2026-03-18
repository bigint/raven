"use client";

import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";
import type {
  ImageAttachment,
  PlaygroundSettings
} from "../components/chat-input";
import type { ResponseMeta } from "../components/response-metadata";

interface DisplayMessage {
  content: string;
  id: string;
  images?: ImageAttachment[];
  meta?: ResponseMeta;
  reasoning?: string;
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

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string };

type Message = {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
};

export const catalogModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CatalogModel[]>("/v1/available-models"),
    queryKey: ["available-models"]
  });

// SSE helpers

const parseSSEStream = async function* (
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<{
  reasoning?: string;
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}> {
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: { prompt_tokens: number; completion_tokens: number } | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);

        // Extract usage from finish chunk
        if (parsed.usage) {
          usage = {
            completion_tokens: parsed.usage.completion_tokens ?? 0,
            prompt_tokens: parsed.usage.prompt_tokens ?? 0
          };
        }

        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content || delta?.reasoning_content) {
          yield {
            reasoning: delta.reasoning_content,
            text: delta.content ?? ""
          };
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  // Yield final empty chunk with usage if available
  if (usage) {
    yield { text: "", usage };
  }
};

// Hook

export const useChat = () => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<{
    model: string;
    provider: string;
  } | null>(null);
  const [settings, setSettings] = useState<PlaygroundSettings>({
    chatMemory: 5,
    enableReasoning: false,
    enableTools: false,
    enableWebSearch: false,
    maxTokens: 4096,
    reasoningBudget: 8192,
    showMetadata: true,
    stream: true,
    temperature: 0.7
  });
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef<PlaygroundKey | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
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
    return pk;
  };

  const sendMessage = useCallback(
    async (content: string, images?: ImageAttachment[]) => {
      if (
        (!content.trim() && (!images || images.length === 0)) ||
        !selectedModel ||
        isStreaming
      )
        return;

      const userMessage: DisplayMessage = {
        content: content.trim(),
        id: crypto.randomUUID(),
        images,
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
      const startTime = performance.now();

      try {
        const pk = await ensureKey();

        // Build messages array
        const allMessages: Message[] = [...messages, userMessage].map((m) => {
          if (m.images && m.images.length > 0) {
            const parts: ContentPart[] = [];
            for (const img of m.images) {
              parts.push({ image: img.base64, type: "image" });
            }
            if (m.content) {
              parts.push({ text: m.content, type: "text" });
            }
            return { content: parts, role: m.role };
          }
          return { content: m.content, role: m.role };
        });

        const recentMessages = allMessages.slice(-settings.chatMemory);

        const fullSystemPrompt = [
          systemPrompt,
          settings.enableWebSearch
            ? "You have access to the web. When the user asks about current events, recent information, or anything that requires up-to-date knowledge, search the web and cite your sources with URLs."
            : ""
        ]
          .filter(Boolean)
          .join("\n\n");

        const chatMessages: Message[] = [
          ...(fullSystemPrompt
            ? [{ content: fullSystemPrompt, role: "system" as const }]
            : []),
          ...recentMessages
        ];

        const demoTools = settings.enableTools
          ? [
              {
                function: {
                  description: "Get the current weather for a location",
                  name: "get_weather",
                  parameters: {
                    properties: {
                      location: {
                        description: "City name, e.g. San Francisco",
                        type: "string"
                      }
                    },
                    required: ["location"],
                    type: "object"
                  }
                },
                type: "function" as const
              },
              {
                function: {
                  description:
                    "Evaluate a math expression and return the result",
                  name: "calculate",
                  parameters: {
                    properties: {
                      expression: {
                        description:
                          "Math expression to evaluate, e.g. 2 + 2 * 3",
                        type: "string"
                      }
                    },
                    required: ["expression"],
                    type: "object"
                  }
                },
                type: "function" as const
              }
            ]
          : undefined;

        const body = {
          max_tokens: settings.maxTokens,
          messages: chatMessages,
          model: selectedModel.model,
          stream: settings.stream,
          ...(settings.stream
            ? { stream_options: { include_usage: true } }
            : {}),
          ...(settings.enableReasoning
            ? {
                reasoning: {
                  budget_tokens: settings.reasoningBudget
                },
                reasoning_effort: "medium"
              }
            : { temperature: settings.temperature }),
          ...(demoTools ? { tools: demoTools } : {})
        };

        const response = await fetch(
          `${API_URL}/v1/proxy/${selectedModel.provider}/chat/completions`,
          {
            body: JSON.stringify(body),
            headers: {
              Authorization: `Bearer ${pk.key}`,
              "Content-Type": "application/json",
              "x-session-id": sessionIdRef.current
            },
            method: "POST",
            signal: abortController.signal
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const errMsg =
            (err as Record<string, unknown>)?.error &&
            typeof (err as Record<string, unknown>).error === "object"
              ? (
                  (err as Record<string, unknown>).error as Record<
                    string,
                    unknown
                  >
                )?.message
              : (err as Record<string, unknown>)?.message;
          throw new Error(
            (errMsg as string) ??
              `Request failed with status ${response.status}`
          );
        }

        if (settings.stream && response.body) {
          const reader = response.body.getReader();
          let finalUsage:
            | { prompt_tokens: number; completion_tokens: number }
            | undefined;

          for await (const chunk of parseSSEStream(reader)) {
            if (chunk.usage) {
              finalUsage = chunk.usage;
            }
            if (chunk.text || chunk.reasoning) {
              setMessages((prev) => {
                const idx = prev.length - 1;
                const msg = prev[idx];
                if (!msg || msg.id !== assistantMessage.id) return prev;
                const updated = [...prev];
                updated[idx] = {
                  ...msg,
                  content: msg.content + (chunk.text ?? ""),
                  ...(chunk.reasoning
                    ? { reasoning: (msg.reasoning ?? "") + chunk.reasoning }
                    : {})
                };
                return updated;
              });
            }
          }

          const elapsedMs = Math.round(performance.now() - startTime);
          const meta: ResponseMeta = {
            inputTokens: finalUsage?.prompt_tokens,
            latencyMs: elapsedMs,
            outputTokens: finalUsage?.completion_tokens
          };

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessage.id ? { ...m, meta } : m))
          );
        } else {
          const result = await response.json();
          const choice = (result as Record<string, unknown>).choices as
            | Record<string, unknown>[]
            | undefined;
          const msg = choice?.[0]?.message as
            | Record<string, unknown>
            | undefined;
          const text = msg?.content as string | undefined;
          const reasoningContent = msg?.reasoning_content as string | undefined;
          const usage = (result as Record<string, unknown>).usage as
            | Record<string, unknown>
            | undefined;

          const elapsedMs = Math.round(performance.now() - startTime);
          const meta: ResponseMeta = {
            inputTokens: (usage?.prompt_tokens as number) ?? 0,
            latencyMs: elapsedMs,
            outputTokens: (usage?.completion_tokens as number) ?? 0
          };

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    content: text ?? "",
                    meta,
                    ...(reasoningContent ? { reasoning: reasoningContent } : {})
                  }
                : m
            )
          );
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
    [selectedModel, messages, isStreaming, settings]
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
    }
    sessionIdRef.current = crypto.randomUUID();
  }, [queryClient]);

  return {
    clearMessages,
    isStreaming,
    messages,
    selectedModel,
    sendMessage,
    setSelectedModel,
    setSettings,
    setSystemPrompt,
    settings,
    stopStreaming,
    systemPrompt
  };
};
