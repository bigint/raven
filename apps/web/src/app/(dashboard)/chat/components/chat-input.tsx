"use client";

import { Switch, Textarea } from "@raven/ui";
import {
  ArrowUp,
  ChevronDown,
  ImagePlus,
  Square,
  Thermometer,
  X
} from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

export interface PlaygroundSettings {
  readonly temperature: number;
  readonly maxTokens: number;
  readonly stream: boolean;
  readonly showMetadata: boolean;
  readonly enableTools: boolean;
  readonly enableWebSearch: boolean;
  readonly enableReasoning: boolean;
  readonly reasoningBudget: number;
  readonly chatMemory: number;
}

interface ModelOption {
  readonly label: string;
  readonly value: string;
  readonly provider: string;
}

export interface ImageAttachment {
  readonly id: string;
  readonly base64: string;
  readonly name: string;
  readonly preview: string;
}

type Popover = "model" | "temperature" | "memory" | "settings" | null;

interface ChatInputProps {
  readonly disabled: boolean;
  readonly isStreaming: boolean;
  readonly onSend: (content: string, images?: ImageAttachment[]) => void;
  readonly onStop: () => void;
  readonly model?: string;
  readonly modelOptions: readonly ModelOption[];
  readonly onModelChange: (model: string, provider: string) => void;
  readonly settings: PlaygroundSettings;
  readonly onSettingsChange: (settings: PlaygroundSettings) => void;
  readonly systemPrompt: string;
  readonly onSystemPromptChange: (value: string) => void;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [openPopover, setOpenPopover] = useState<Popover>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke any remaining object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const img of images) {
        URL.revokeObjectURL(img.preview);
      }
    };
    // Only run cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (p: Popover) =>
    setOpenPopover((cur) => (cur === p ? null : p));

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const handleSend = useCallback(() => {
    if ((!value.trim() && images.length === 0) || disabled) return;
    onSend(value, images.length > 0 ? images : undefined);
    setValue("");
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, images, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newImages: ImageAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_IMAGE_SIZE) continue;

      const base64 = await fileToBase64(file);
      newImages.push({
        base64,
        id: crypto.randomUUID(),
        name: file.name,
        preview: URL.createObjectURL(file)
      });
    }

    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        const dt = new DataTransfer();
        for (const f of imageFiles) dt.items.add(f);
        handleFileSelect(dt.files);
      }
    },
    [handleFileSelect]
  );

  const update = <K extends keyof PlaygroundSettings>(
    key: K,
    val: PlaygroundSettings[K]
  ) => onSettingsChange({ ...settings, [key]: val });

  return (
    <div className="px-4 py-3 md:px-6">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone for image uploads */}
      <div
        className="mx-auto max-w-3xl rounded-xl border border-border bg-muted/30 shadow-sm transition-colors focus-within:border-ring focus-within:bg-background"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {images.map((img) => (
              <div className="group relative" key={img.id}>
                <img
                  alt={img.name}
                  className="size-16 rounded-lg border border-border object-cover"
                  src={img.preview}
                />
                <button
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-background border border-border p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  onClick={() => removeImage(img.id)}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          aria-label="Message input"
          className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          disabled={isStreaming}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            images.length > 0
              ? "Add a message about the image(s)..."
              : "Start a new message..."
          }
          ref={textareaRef}
          rows={1}
          style={{ maxHeight: 200 }}
          value={value}
        />

        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-0.5">
            {/* Image upload */}
            <button
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              type="button"
            >
              <ImagePlus className="size-3.5" />
            </button>
            <input
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              ref={fileInputRef}
              type="file"
            />

            <Sep />

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

            {!settings.enableReasoning && (
              <>
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
                          <span className="text-xs font-medium">
                            Temperature
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {settings.temperature}
                          </span>
                        </div>
                        <input
                          className="w-full accent-primary"
                          max="2"
                          min="0"
                          onChange={(e) =>
                            update(
                              "temperature",
                              Number.parseFloat(e.target.value)
                            )
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
              </>
            )}

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

                    <div className="flex items-center justify-between">
                      <span className="text-xs">Web Search</span>
                      <Switch
                        checked={settings.enableWebSearch}
                        onCheckedChange={(v) => update("enableWebSearch", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs">Reasoning</span>
                      <Switch
                        checked={settings.enableReasoning}
                        onCheckedChange={(v) => update("enableReasoning", v)}
                      />
                    </div>

                    {settings.enableReasoning && (
                      <div className="space-y-1.5 rounded-md bg-muted px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Token budget
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {settings.reasoningBudget.toLocaleString()}
                          </span>
                        </div>
                        <input
                          className="w-full accent-primary"
                          max="32000"
                          min="1024"
                          onChange={(e) =>
                            update(
                              "reasoningBudget",
                              Number.parseInt(e.target.value, 10)
                            )
                          }
                          step="1024"
                          type="range"
                          value={settings.reasoningBudget}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Max tokens for the model's thinking process. Works
                          with Claude and other reasoning models.
                        </p>
                      </div>
                    )}
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
              disabled={(!value.trim() && images.length === 0) || disabled}
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
