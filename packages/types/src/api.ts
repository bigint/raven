// Shared type definitions that mirror the Zod schemas in the API backend
// and the database enums. These are the canonical TypeScript types for use
// across the frontend and any shared packages.

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type PlatformRole = "user" | "admin";
export type KeyEnvironment = "live" | "test";
export type BudgetEntityType = "organization" | "key";
export type BudgetPeriod = "daily" | "monthly";
export type GuardrailType =
  | "block_topics"
  | "pii_detection"
  | "content_filter"
  | "custom_regex";
export type GuardrailAction = "block" | "warn" | "log";
