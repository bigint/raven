"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";
import type { ResponseMeta } from "../components/response-metadata";
import { parseSSEStream } from "../lib/stream-parser";
import type { ImageAttachment, PlaygroundSettings } from "../lib/types";

interface DisplayMessage {
  readonly content: string;
  readonly id: string;
  readonly images?: readonly ImageAttachment[];
  readonly meta?: ResponseMeta;
  readonly reasoning?: string;
  readonly role: "assistant" | "user";
}

interface PlaygroundKey {
  readonly id: string;
  readonly key: string;
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string };

type Message = {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
};

const PLAYGROUND_KEY_TTL_MS = 3_600_000; // 1 hour

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
    enableKnowledge: false,
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
  const streamBufferRef = useRef("");
  const streamReasoningBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  // Keep refs for values used inside sendMessage to avoid stale closures
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const systemPromptRef = useRef(systemPrompt);
  systemPromptRef.current = systemPrompt;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    return () => {
      const key = keyRef.current;
      if (key) {
        api.delete(`/v1/keys/${key.id}`).catch(() => {});
        keyRef.current = null;
      }
    };
  }, []);

  const ensureKey = async (): Promise<PlaygroundKey> => {
    if (keyRef.current) return keyRef.current;
    const result = await api.post<PlaygroundKey>("/v1/keys", {
      environment: "test",
      expiresAt: new Date(Date.now() + PLAYGROUND_KEY_TTL_MS).toISOString(),
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

      // Read current values from refs to avoid stale closures
      const currentMessages = messagesRef.current;
      const currentSystemPrompt = systemPromptRef.current;
      const currentSettings = settingsRef.current;

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
      // Strip base64 data from stored messages to prevent memory growth
      setMessages((prev) =>
        prev.map((m) =>
          m.images?.length
            ? { ...m, images: m.images.map((img) => ({ ...img, base64: "" })) }
            : m
        )
      );
      setIsStreaming(true);

      const abortController = new AbortController();
      abortRef.current = abortController;
      const startTime = performance.now();

      try {
        const pk = await ensureKey();

        // Build messages array
        const allMessages: Message[] = [...currentMessages, userMessage].map(
          (m) => {
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
          }
        );

        const recentMessages = allMessages.slice(-currentSettings.chatMemory);

        const fullSystemPrompt = [
          currentSystemPrompt,
          currentSettings.enableWebSearch
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

        const demoTools = currentSettings.enableTools
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
          max_tokens: currentSettings.maxTokens,
          messages: chatMessages,
          model: selectedModel.model,
          stream: currentSettings.stream,
          ...(currentSettings.stream
            ? { stream_options: { include_usage: true } }
            : {}),
          ...(currentSettings.enableReasoning
            ? {
                reasoning: {
                  budget_tokens: currentSettings.reasoningBudget
                },
                reasoning_effort: "medium"
              }
            : { temperature: currentSettings.temperature }),
          ...(demoTools ? { tools: demoTools } : {})
        };

        const response = await fetch(
          `${API_URL}/v1/proxy/${selectedModel.provider}/chat/completions`,
          {
            body: JSON.stringify(body),
            headers: {
              Authorization: `Bearer ${pk.key}`,
              "Content-Type": "application/json",
              "x-session-id": sessionIdRef.current,
              ...(currentSettings.enableKnowledge
                ? { "X-Knowledge-Enabled": "true" }
                : {})
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

        if (currentSettings.stream && response.body) {
          const reader = response.body.getReader();
          let finalUsage:
            | { prompt_tokens: number; completion_tokens: number }
            | undefined;

          const flushBufferToMessages = () => {
            const text = streamBufferRef.current;
            const reasoning = streamReasoningBufferRef.current;
            streamBufferRef.current = "";
            streamReasoningBufferRef.current = "";
            if (!text && !reasoning) return;
            setMessages((prev) => {
              const idx = prev.length - 1;
              const msg = prev[idx];
              if (!msg || msg.id !== assistantMessage.id) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...msg,
                content: msg.content + text,
                ...(reasoning
                  ? { reasoning: (msg.reasoning ?? "") + reasoning }
                  : {})
              };
              return updated;
            });
          };

          for await (const chunk of parseSSEStream(reader)) {
            if (chunk.usage) {
              finalUsage = chunk.usage;
            }
            if (chunk.text || chunk.reasoning) {
              streamBufferRef.current += chunk.text ?? "";
              if (chunk.reasoning) {
                streamReasoningBufferRef.current += chunk.reasoning;
              }
              if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                  rafRef.current = null;
                  flushBufferToMessages();
                });
              }
            }
          }

          // Flush any remaining buffered content after stream ends
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          flushBufferToMessages();

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
    [selectedModel, isStreaming]
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
