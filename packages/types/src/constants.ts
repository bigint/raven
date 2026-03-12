import type { BadgeVariant } from "./ui";

export const ROLE_OPTIONS = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Viewer", value: "viewer" },
] as const;

export const ROLE_BADGE_VARIANT: Record<string, BadgeVariant> = {
  admin: "primary",
  member: "neutral",
  owner: "primary",
  viewer: "neutral",
};

export const ENVIRONMENT_OPTIONS = [
  { label: "Live", value: "live" },
  { label: "Test", value: "test" },
] as const;

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  google: "Google",
  openai: "OpenAI",
};
