"use client";

import { Button, PageHeader, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { ChatInput } from "./components/chat-input";
import { ChatMessages } from "./components/chat-messages";
import { ModelInput } from "./components/model-input";
import { PlaygroundSettingsPanel } from "./components/playground-settings";
import { catalogModelsQueryOptions, useChat } from "./hooks/use-chat";

const ChatPage = () => {
  const {
    clearMessages,
    isStreaming,
    messages,
    selectedModel,
    sendMessage,
    setSelectedModel,
    settings,
    setSettings,
    stopStreaming
  } = useChat();

  const { data: models = [], isLoading: modelsLoading } = useQuery(
    catalogModelsQueryOptions()
  );

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        label: m.name,
        provider: m.provider,
        value: m.slug
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
        title="Playground"
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <PlaygroundSettingsPanel
          onSettingsChange={setSettings}
          settings={settings}
        />
        <ChatMessages
          isStreaming={isStreaming}
          messages={messages}
          showMetadata={settings.showMetadata}
        />
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
