"use client";

import { Button } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { catalogModelsQueryOptions } from "@/lib/use-models";
import { ChatInput } from "./components/chat-input";
import { ChatMessages } from "./components/chat-messages";
import { useChat } from "./hooks/use-chat";
import { useInitialModelSelection } from "./hooks/use-initial-model-selection";

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
    setSystemPrompt,
    stopStreaming,
    systemPrompt
  } = useChat();

  const { data: models = [] } = useQuery(catalogModelsQueryOptions());

  useInitialModelSelection({
    models,
    selectedModel,
    setSelectedModel,
    setSystemPrompt,
    systemPrompt
  });

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
    <div className="flex h-[calc(100dvh-var(--spacing)*8)] flex-col md:h-dvh md:-m-6 md:p-6">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-lg font-semibold">Playground</h1>
          <p className="text-sm text-muted-foreground">
            Test your AI providers and models through the gateway.
          </p>
        </div>
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

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <ChatMessages
          isStreaming={isStreaming}
          messages={messages}
          onExampleSelect={sendMessage}
          showMetadata={settings.showMetadata}
        />
        <ChatInput
          disabled={!selectedModel}
          isStreaming={isStreaming}
          model={selectedModel?.model}
          modelOptions={modelOptions}
          onModelChange={(model, provider) =>
            setSelectedModel({ model, provider })
          }
          onSend={sendMessage}
          onSettingsChange={setSettings}
          onStop={stopStreaming}
          onSystemPromptChange={setSystemPrompt}
          settings={settings}
          systemPrompt={systemPrompt}
        />
      </div>
    </div>
  );
};

export default ChatPage;
