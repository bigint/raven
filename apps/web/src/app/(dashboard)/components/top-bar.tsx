"use client";

import { Breadcrumb, type BreadcrumbSegment } from "@raven/ui";
import { CircleHelp, MessageSquare, Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";

interface TopBarProps {
  segments: readonly BreadcrumbSegment[];
}

const TopBar = ({ segments }: TopBarProps) => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <div className="h-12 border-b border-border bg-background flex items-center gap-2 px-4">
      <Breadcrumb segments={segments} />
      <div className="flex-1" />
      <button
        className="h-7 inline-flex items-center gap-1.5 px-2.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground hover:border-input transition-colors"
        type="button"
      >
        <MessageSquare className="size-3" strokeWidth={1.5} />
        Feedback
      </button>
      <button
        aria-label="Help"
        className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground border border-border hover:text-foreground hover:border-input transition-colors"
        type="button"
      >
        <CircleHelp className="size-3.5" strokeWidth={1.5} />
      </button>
      <button
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground border border-border hover:text-foreground hover:border-input transition-colors"
        onClick={toggleTheme}
        type="button"
      >
        <Icon className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
};

export type { TopBarProps };
export { TopBar };
