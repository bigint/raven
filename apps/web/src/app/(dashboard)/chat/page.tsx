"use client";

import { Button, PageHeader, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { providersQueryOptions } from "../providers/hooks/use-providers";
import { ChatInput } from "./components/chat-input";
import { ChatMessages } from "./components/chat-messages";
import { ModelInput } from "./components/model-input";
import { providerModelsQueryOptions, useChat } from "./hooks/use-chat";

const ChatPage = () => {
  const {
    clearMessages,
    isStreaming,
    messages,
    selectedModel,
    sendMessage,
    setSelectedModel,
    stopStreaming
  } = useChat();

  const { data: providers = [] } = useQuery(providersQueryOptions());

  const enabledProviders = useMemo(
    () => providers.filter((p) => p.isEnabled),
    [providers]
  );

  const { data: models = [], isLoading: modelsLoading } = useQuery(
    providerModelsQueryOptions(enabledProviders)
  );

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        label: m.name,
        provider: m.provider,
        value: m.id
      })),
    [models]
  );

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {modelsLoading && <Spinner size="sm" />}
            <ModelInput
              disabled={modelsLoading}
              onChange={(model, provider) =>
                setSelectedModel({ model, provider })
              }
              options={modelOptions}
              value={selectedModel?.model ?? ""}
            />
            {messages.length > 0 && (
              <Button
                disabled={isStreaming}
                onClick={clearMessages}
                size="sm"
                variant="ghost"
              >
                <RotateCcw className="size-3.5" />
                New Chat
              </Button>
            )}
          </div>
        }
        description="Test your AI providers and models through the gateway."
        title="Chat"
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <ChatMessages isStreaming={isStreaming} messages={messages} />
        <ChatInput
          disabled={!selectedModel}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
        />
      </div>
    </div>
  );
};

export default ChatPage;
