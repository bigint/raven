"use client";

import { ArrowUp, Settings2, Square, Thermometer } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";

interface ChatInputProps {
  disabled: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  model?: string;
  temperature?: number;
  stream?: boolean;
  onSettingsToggle?: () => void;
}

export const ChatInput = ({
  disabled,
  isStreaming,
  onSend,
  onStop,
  model,
  temperature,
  stream,
  onSettingsToggle
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
    <div className="px-4 py-3 md:px-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-muted/30 shadow-sm transition-colors focus-within:border-ring focus-within:bg-background">
        {/* Textarea */}
        <textarea
          className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          disabled={isStreaming}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? "Loading models..." : "Start a new message..."
          }
          ref={textareaRef}
          rows={1}
          style={{ maxHeight: 200 }}
          value={value}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            {model && (
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {model}
              </span>
            )}

            {temperature !== undefined && (
              <>
                <span className="mx-1 text-border">|</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Thermometer className="size-3" />
                  {temperature}
                </span>
              </>
            )}

            {stream !== undefined && (
              <>
                <span className="mx-1 text-border">|</span>
                <span className="text-[11px] text-muted-foreground">
                  {stream ? "Stream" : "Batch"}
                </span>
              </>
            )}

            {onSettingsToggle && (
              <>
                <span className="mx-1 text-border">|</span>
                <button
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={onSettingsToggle}
                  title="Settings"
                  type="button"
                >
                  <Settings2 className="size-3.5" />
                </button>
              </>
            )}
          </div>

          {isStreaming ? (
            <button
              className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={onStop}
              type="button"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={!value.trim() || disabled}
              onClick={handleSend}
              type="button"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
