"use client";

import { Button } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatInput } from "./components/chat-input";
import { ChatMessages } from "./components/chat-messages";
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
    setSystemPrompt,
    stopStreaming,
    systemPrompt
  } = useChat();

  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: models = [] } = useQuery(catalogModelsQueryOptions());

  // Auto-select first model, or use URL params
  useEffect(() => {
    if (!models.length || selectedModel) return;

    const urlSystem = searchParams.get("system");
    const urlModel = searchParams.get("model");

    if (urlSystem && !systemPrompt) {
      setSystemPrompt(urlSystem);
    }

    if (urlModel) {
      const match = models.find(
        (m) => m.slug === urlModel || m.name === urlModel
      );
      if (match) {
        setSelectedModel({ model: match.slug, provider: match.provider });
        return;
      }
    }

    const first = models[0];
    if (first) {
      setSelectedModel({ model: first.slug, provider: first.provider });
    }
  }, [
    searchParams,
    models,
    systemPrompt,
    selectedModel,
    setSystemPrompt,
    setSelectedModel
  ]);

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        label: m.name,
        provider: m.provider,
        value: m.slug
      })),
    [models]
  );

  const toggleSettings = useCallback(() => setSettingsOpen((o) => !o), []);

  return (
    <div className="flex h-[calc(100dvh-var(--spacing)*8)] flex-col md:h-dvh md:-m-6 md:p-6">
      {/* Minimal header */}
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
        <PlaygroundSettingsPanel
          onOpenChange={setSettingsOpen}
          onSettingsChange={setSettings}
          onSystemPromptChange={setSystemPrompt}
          open={settingsOpen}
          settings={settings}
          systemPrompt={systemPrompt}
        />
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
          onSettingsToggle={toggleSettings}
          onStop={stopStreaming}
          stream={settings.stream}
          temperature={settings.temperature}
        />
      </div>
    </div>
  );
};

export default ChatPage;
