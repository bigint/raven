import type { Provider } from "./providers";

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  google: "Google AI",
  openai: "OpenAI"
};

export const ROLE_OPTIONS = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Viewer", value: "viewer" }
] as const;

export const ROLE_BADGE_VARIANT: Record<
  string,
  "primary" | "neutral" | "info"
> = {
  admin: "info",
  member: "neutral",
  owner: "primary"
};

export const ENVIRONMENT_OPTIONS = [
  { label: "Live", value: "live" },
  { label: "Test", value: "test" }
] as const;
