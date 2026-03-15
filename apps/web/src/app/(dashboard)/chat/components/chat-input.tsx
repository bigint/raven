"use client";

import { Button } from "@raven/ui";
import { ArrowUp, Square } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";

interface ChatInputProps {
  disabled: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

export const ChatInput = ({
  disabled,
  isStreaming,
  onSend,
  onStop
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const handleSend = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isStreaming}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? "Select a provider and model to start" : "Send a message"
          }
          ref={textareaRef}
          rows={1}
          style={{ maxHeight: 200 }}
          value={value}
        />
        {isStreaming ? (
          <Button onClick={onStop} size="md" variant="secondary">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            disabled={!value.trim() || disabled}
            onClick={handleSend}
            size="md"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
