"use client";

import { Input, Switch } from "@raven/ui";
import { Settings2 } from "lucide-react";
import { useState } from "react";

interface PlaygroundSettings {
  temperature: number;
  maxTokens: number;
  stream: boolean;
  showMetadata: boolean;
}

interface PlaygroundSettingsPanelProps {
  settings: PlaygroundSettings;
  onSettingsChange: (settings: PlaygroundSettings) => void;
}

const PlaygroundSettingsPanel = ({
  settings,
  onSettingsChange
}: PlaygroundSettingsPanelProps) => {
  const [open, setOpen] = useState(false);

  const update = <K extends keyof PlaygroundSettings>(
    key: K,
    value: PlaygroundSettings[K]
  ) => onSettingsChange({ ...settings, [key]: value });

  if (!open) {
    return (
      <button
        className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => setOpen(true)}
        title="Playground Settings"
        type="button"
      >
        <Settings2 className="size-4" />
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-0 z-20 h-full w-72 border-l border-border bg-background p-4 space-y-4 overflow-y-auto shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Settings</h3>
        <button
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          onClick={() => setOpen(false)}
          type="button"
        >
          <span className="text-xs">Close</span>
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Temperature: {settings.temperature}
        </label>
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
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      <Input
        label="Max Tokens"
        onChange={(e) =>
          update("maxTokens", Number.parseInt(e.target.value, 10) || 4096)
        }
        type="number"
        value={String(settings.maxTokens)}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm">Streaming</label>
          <Switch
            checked={settings.stream}
            onCheckedChange={(v) => update("stream", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm">Show Metadata</label>
          <Switch
            checked={settings.showMetadata}
            onCheckedChange={(v) => update("showMetadata", v)}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Metadata shows provider, latency, tokens, cost, and cache info for
          each response.
        </p>
      </div>
    </div>
  );
};

export type { PlaygroundSettings };
export { PlaygroundSettingsPanel };
