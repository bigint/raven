"use client";

import { Button, EmptyState } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Network, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ProviderIcon } from "@/components/model-icon";
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

  const { data: allModels = [], isLoading: modelsLoading } = useQuery(
    catalogModelsQueryOptions()
  );

  // Filter to chat-capable models for the playground
  const chatModels = useMemo(
    () => allModels.filter((m) => m.capabilities.includes("chat")),
    [allModels]
  );

  useInitialModelSelection({
    models: chatModels,
    selectedModel,
    setSelectedModel,
    setSystemPrompt,
    systemPrompt
  });

  // Check if the selected model supports vision (image uploads)
  const selectedModelData = useMemo(
    () => chatModels.find((m) => m.slug === selectedModel?.model),
    [chatModels, selectedModel?.model]
  );
  const supportsVision =
    selectedModelData?.capabilities.includes("vision") ?? false;

  const modelOptions = useMemo(
    () =>
      chatModels.map((m) => ({
        icon: <ProviderIcon provider={m.provider} size={14} />,
        label: m.name,
        provider: m.provider,
        value: m.slug
      })),
    [chatModels]
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

      {!modelsLoading && chatModels.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border">
          <EmptyState
            action={
              <Link href="/providers">
                <Button>
                  <Network className="size-4" />
                  Add Provider
                </Button>
              </Link>
            }
            bordered={false}
            description="Connect an AI provider to start using the playground."
            icon={<Network className="size-8" />}
            title="Connect a provider first"
          />
        </div>
      ) : (
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
            supportsVision={supportsVision}
            systemPrompt={systemPrompt}
          />
        </div>
      )}
    </div>
  );
};

export default ChatPage;
