"use client";

import { useEffect, useRef } from "react";
import { ExamplePrompts } from "./example-prompts";
import { Markdown } from "./markdown";
import type { ResponseMeta } from "./response-metadata";
import { ResponseMetadata } from "./response-metadata";

interface ImageAttachment {
  id: string;
  base64: string;
  name: string;
  preview: string;
}

interface ChatMessage {
  content: string;
  id: string;
  images?: ImageAttachment[];
  meta?: ResponseMeta;
  role: "assistant" | "user";
}

interface ChatMessagesProps {
  isStreaming: boolean;
  messages: ChatMessage[];
  onExampleSelect: (message: string) => void;
  showMetadata: boolean;
}

export const ChatMessages = ({
  isStreaming,
  messages,
  onExampleSelect,
  showMetadata
}: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return <ExamplePrompts onSelect={onExampleSelect} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => {
          const isUser = message.role === "user";
          const isCurrentAssistant =
            message.role === "assistant" &&
            isStreaming &&
            message.id === messages[messages.length - 1]?.id;

          return (
            <div
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              key={message.id}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {isUser ? (
                  <>
                    {message.images && message.images.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {message.images.map((img) => (
                          <img
                            alt={img.name}
                            className="max-h-48 max-w-full rounded-lg"
                            key={img.id}
                            src={img.preview}
                          />
                        ))}
                      </div>
                    )}
                    {message.content}
                  </>
                ) : (
                  <Markdown content={message.content} />
                )}
                {isCurrentAssistant && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-text-bottom" />
                )}
              </div>
              {!isUser && message.meta && (
                <ResponseMetadata meta={message.meta} show={showMetadata} />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
