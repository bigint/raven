"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

interface ChatMessagesProps {
  isStreaming: boolean;
  messages: ChatMessage[];
}

export const ChatMessages = ({ isStreaming, messages }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="size-5" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">No messages yet</p>
          <p className="mt-1 text-sm">
            Select a provider and model, then send a message to start.
          </p>
        </div>
      </div>
    );
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
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              key={message.id}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.content}
                {isCurrentAssistant && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-text-bottom" />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
