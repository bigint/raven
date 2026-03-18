"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ExamplePrompts } from "./example-prompts";
import { Markdown } from "./markdown";
import type { ResponseMeta } from "./response-metadata";
import { ResponseMetadata } from "./response-metadata";

interface ImageAttachment {
  readonly id: string;
  readonly base64: string;
  readonly name: string;
  readonly preview: string;
}

interface ChatMessage {
  readonly content: string;
  readonly id: string;
  readonly images?: readonly ImageAttachment[];
  readonly meta?: ResponseMeta;
  readonly reasoning?: string;
  readonly role: "assistant" | "user";
}

interface ChatMessagesProps {
  isStreaming: boolean;
  messages: ChatMessage[];
  onExampleSelect: (message: string) => void;
  showMetadata: boolean;
}

const ReasoningBlock = ({
  content,
  isStreaming
}: {
  content: string;
  isStreaming?: boolean;
}) => {
  const [expanded, setExpanded] = useState(isStreaming ?? false);

  return (
    <div className="mb-2 rounded-lg border border-border/50 bg-background/50">
      <button
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        Thinking
        {isStreaming && !expanded && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse rounded-sm bg-current" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded-sm bg-current align-text-bottom" />
          )}
        </div>
      )}
    </div>
  );
};

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
                  <>
                    {message.reasoning && (
                      <ReasoningBlock
                        content={message.reasoning}
                        isStreaming={isCurrentAssistant}
                      />
                    )}
                    <Markdown content={message.content} />
                  </>
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
