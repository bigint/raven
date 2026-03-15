export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type TeamRole = "lead" | "member";
export type PlatformRole = "user" | "admin";
export type KeyEnvironment = "live" | "test";
export type BudgetEntityType = "organization" | "team" | "key";
export type BudgetPeriod = "daily" | "monthly";
export type GuardrailType =
  | "block_topics"
  | "pii_detection"
  | "content_filter"
  | "custom_regex";
export type GuardrailAction = "block" | "warn" | "log";
