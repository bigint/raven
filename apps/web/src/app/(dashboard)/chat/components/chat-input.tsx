"use client";

import { Switch, Textarea } from "@raven/ui";
import { ArrowUp, ChevronDown, Square, Thermometer, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";

export interface PlaygroundSettings {
  temperature: number;
  maxTokens: number;
  stream: boolean;
  showMetadata: boolean;
  enableTools: boolean;
  chatMemory: number;
}

interface ModelOption {
  label: string;
  value: string;
  provider: string;
}

type Popover = "model" | "temperature" | "memory" | "settings" | null;

interface ChatInputProps {
  disabled: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  model?: string;
  modelOptions: ModelOption[];
  onModelChange: (model: string, provider: string) => void;
  settings: PlaygroundSettings;
  onSettingsChange: (settings: PlaygroundSettings) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
}

export const ChatInput = ({
  disabled,
  isStreaming,
  onSend,
  onStop,
  model,
  modelOptions,
  onModelChange,
  settings,
  onSettingsChange,
  systemPrompt,
  onSystemPromptChange
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [openPopover, setOpenPopover] = useState<Popover>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggle = (p: Popover) =>
    setOpenPopover((cur) => (cur === p ? null : p));

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

  const update = <K extends keyof PlaygroundSettings>(
    key: K,
    val: PlaygroundSettings[K]
  ) => onSettingsChange({ ...settings, [key]: val });

  return (
    <div className="px-4 py-3 md:px-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-muted/30 shadow-sm transition-colors focus-within:border-ring focus-within:bg-background">
        <textarea
          className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          disabled={isStreaming}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Start a new message..."
          ref={textareaRef}
          rows={1}
          style={{ maxHeight: 200 }}
          value={value}
        />

        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-0.5">
            {/* Model selector */}
            <div className="relative">
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => toggle("model")}
                type="button"
              >
                {model ?? "Select model"}
                <ChevronDown className="size-3" />
              </button>

              {openPopover === "model" && (
                <Dropdown onClose={() => setOpenPopover(null)}>
                  <div className="max-h-60 w-56 overflow-y-auto py-1">
                    {modelOptions.map((opt) => (
                      <button
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${opt.value === model ? "text-foreground font-medium" : "text-muted-foreground"}`}
                        key={opt.value}
                        onClick={() => {
                          onModelChange(opt.value, opt.provider);
                          setOpenPopover(null);
                        }}
                        type="button"
                      >
                        <span className="truncate">{opt.label}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                          {opt.provider}
                        </span>
                      </button>
                    ))}
                    {modelOptions.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No models. Add a provider first.
                      </p>
                    )}
                  </div>
                </Dropdown>
              )}
            </div>

            <Sep />

            {/* Temperature */}
            <div className="relative">
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => toggle("temperature")}
                type="button"
              >
                <Thermometer className="size-3" />
                {settings.temperature}
              </button>

              {openPopover === "temperature" && (
                <Dropdown onClose={() => setOpenPopover(null)}>
                  <div className="w-52 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Temperature</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {settings.temperature}
                      </span>
                    </div>
                    <input
                      className="w-full accent-primary"
                      max="2"
                      min="0"
                      onChange={(e) =>
                        update("temperature", Number.parseFloat(e.target.value))
                      }
                      step="0.1"
                      type="range"
                      value={settings.temperature}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </Dropdown>
              )}
            </div>

            <Sep />

            {/* Stream toggle */}
            <button
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => update("stream", !settings.stream)}
              type="button"
            >
              {settings.stream ? "Stream" : "Batch"}
            </button>

            <Sep />

            {/* Chat memory */}
            <div className="relative">
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => toggle("memory")}
                type="button"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {settings.chatMemory}
              </button>

              {openPopover === "memory" && (
                <Dropdown onClose={() => setOpenPopover(null)}>
                  <div className="w-56 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Chat memory</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                        {settings.chatMemory}
                      </span>
                    </div>
                    <input
                      className="w-full accent-primary"
                      max="1000"
                      min="1"
                      onChange={(e) =>
                        update(
                          "chatMemory",
                          Number.parseInt(e.target.value, 10)
                        )
                      }
                      step="1"
                      type="range"
                      value={settings.chatMemory}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Sends the last {settings.chatMemory} message
                      {settings.chatMemory === 1 ? "" : "s"} from your
                      conversation each request.
                    </p>
                  </div>
                </Dropdown>
              )}
            </div>

            <Sep />

            {/* Settings popover */}
            <div className="relative">
              <button
                className={`rounded-md p-1 transition-colors ${openPopover === "settings" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                onClick={() => toggle("settings")}
                title="More settings"
                type="button"
              >
                <svg
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>

              {openPopover === "settings" && (
                <Dropdown onClose={() => setOpenPopover(null)}>
                  <div className="w-64 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Settings</span>
                      <button
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setOpenPopover(null)}
                        type="button"
                      >
                        <X className="size-3" />
                      </button>
                    </div>

                    <Textarea
                      onChange={(e) => onSystemPromptChange(e.target.value)}
                      placeholder="System prompt..."
                      rows={3}
                      value={systemPrompt}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs">Max Tokens</span>
                      <input
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
                        onChange={(e) =>
                          update(
                            "maxTokens",
                            Number.parseInt(e.target.value, 10) || 4096
                          )
                        }
                        type="number"
                        value={settings.maxTokens}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs">Show Metadata</span>
                      <Switch
                        checked={settings.showMetadata}
                        onCheckedChange={(v) => update("showMetadata", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs">Tool Use</span>
                      <Switch
                        checked={settings.enableTools}
                        onCheckedChange={(v) => update("enableTools", v)}
                      />
                    </div>
                  </div>
                </Dropdown>
              )}
            </div>
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

// Shared components

const Sep = () => <span className="mx-0.5 text-border">|</span>;

const Dropdown = ({
  children,
  onClose
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <>
    <button
      aria-label="Close"
      className="fixed inset-0 z-40 cursor-default"
      onClick={onClose}
      tabIndex={-1}
      type="button"
    />
    <div className="absolute bottom-full left-0 z-50 mb-1 rounded-lg border border-border bg-popover shadow-sm">
      {children}
    </div>
  </>
);
