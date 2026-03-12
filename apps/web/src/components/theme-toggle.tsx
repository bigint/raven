"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "light" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </button>
  );
};
