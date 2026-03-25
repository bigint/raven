"use client";

import { Button } from "@raven/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { match } from "ts-pattern";
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
  readonly isStreaming: boolean;
  readonly messages: ChatMessage[];
  readonly onExampleSelect: (message: string) => void;
  readonly showMetadata: boolean;
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
      <Button
        className="w-full justify-start px-3 py-1.5 text-xs h-auto"
        onClick={() => setExpanded(!expanded)}
        variant="ghost"
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
      </Button>
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

interface MessageBubbleProps {
  readonly message: ChatMessage;
  readonly isCurrentAssistant: boolean;
  readonly showMetadata: boolean;
}

const MessageBubble = memo(
  ({ message, isCurrentAssistant, showMetadata }: MessageBubbleProps) => {
    const isUser = message.role === "user";

    return (
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {match(message.role)
            .with("user", () => (
              <>
                {message.images && message.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {message.images.map((img) => (
                      <img
                        alt={img.name}
                        className="max-h-48 max-w-full rounded-lg"
                        height={512}
                        key={img.id}
                        src={img.preview}
                        width={512}
                      />
                    ))}
                  </div>
                )}
                {message.content}
              </>
            ))
            .with("assistant", () => (
              <>
                {message.reasoning && (
                  <ReasoningBlock
                    content={message.reasoning}
                    isStreaming={isCurrentAssistant}
                  />
                )}
                <Markdown content={message.content} />
              </>
            ))
            .exhaustive()}
          {isCurrentAssistant && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-text-bottom" />
          )}
        </div>
        {!isUser && message.meta && (
          <ResponseMetadata meta={message.meta} show={showMetadata} />
        )}
      </div>
    );
  }
);

export const ChatMessages = ({
  isStreaming,
  messages,
  onExampleSelect,
  showMetadata
}: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "instant" : "smooth"
    });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return <ExamplePrompts onSelect={onExampleSelect} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
      <div
        aria-live="polite"
        className="mx-auto flex max-w-3xl flex-col gap-4"
        role="log"
      >
        {messages.map((message) => {
          const isCurrentAssistant =
            message.role === "assistant" &&
            isStreaming &&
            message.id === messages[messages.length - 1]?.id;

          return (
            <MessageBubble
              isCurrentAssistant={isCurrentAssistant}
              key={message.id}
              message={message}
              showMetadata={showMetadata}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
