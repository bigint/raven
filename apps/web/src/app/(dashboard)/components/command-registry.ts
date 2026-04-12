import type { LucideIcon } from "lucide-react";

export interface CommandAction {
  readonly id: string;
  readonly title: string;
  readonly section: "Navigation" | "Theme" | "Actions" | "Admin";
  readonly icon: LucideIcon;
  readonly shortcut?: readonly string[];
  readonly href?: string;
  readonly run?: () => void;
}
