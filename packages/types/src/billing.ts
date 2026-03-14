export type Plan = "free" | "pro" | "team" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing";

export interface PlanFeatures {
  readonly maxSeats: number;
  readonly maxRequestsPerMonth: number;
  readonly maxProviders: number;
  readonly maxCustomDomains: number;
  readonly maxBudgets: number;
  readonly maxVirtualKeys: number;
  readonly analyticsRetentionDays: number;
  readonly hasTeams: boolean;
  readonly hasCustomDomains: boolean;
  readonly hasAuditLogs: boolean;
  readonly hasGuardrails: boolean;
  readonly hasWebhooks: boolean;
}

export type BooleanFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends boolean ? K : never;
}[keyof PlanFeatures];

export type NumericFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends number ? K : never;
}[keyof PlanFeatures];

export interface PlanDetails {
  readonly name: string;
  readonly description: string;
  readonly priceMonthly: number;
  readonly priceYearly: number;
  readonly isPopular?: boolean;
}

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
  enterprise: {
    description: "For organizations that need everything.",
    name: "Enterprise",
    priceMonthly: 100,
    priceYearly: 960
  },
  free: {
    description: "For individuals and small experiments.",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0
  },
  pro: {
    description: "For professionals who need more power.",
    isPopular: true,
    name: "Pro",
    priceMonthly: 10,
    priceYearly: 96
  },
  team: {
    description: "For growing teams with advanced needs.",
    name: "Team",
    priceMonthly: 20,
    priceYearly: 192
  }
};

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  enterprise: {
    analyticsRetentionDays: 365,
    hasAuditLogs: true,
    hasCustomDomains: true,
    hasGuardrails: true,
    hasTeams: true,
    hasWebhooks: true,
    maxBudgets: Number.POSITIVE_INFINITY,
    maxCustomDomains: Number.POSITIVE_INFINITY,
    maxProviders: Number.POSITIVE_INFINITY,
    maxRequestsPerMonth: Number.POSITIVE_INFINITY,
    maxSeats: Number.POSITIVE_INFINITY,
    maxVirtualKeys: Number.POSITIVE_INFINITY
  },
  free: {
    analyticsRetentionDays: 7,
    hasAuditLogs: false,
    hasCustomDomains: false,
    hasGuardrails: false,
    hasTeams: false,
    hasWebhooks: false,
    maxBudgets: 1,
    maxCustomDomains: 0,
    maxProviders: 2,
    maxRequestsPerMonth: 10_000,
    maxSeats: 1,
    maxVirtualKeys: 3
  },
  pro: {
    analyticsRetentionDays: 30,
    hasAuditLogs: false,
    hasCustomDomains: true,
    hasGuardrails: true,
    hasTeams: false,
    hasWebhooks: true,
    maxBudgets: 10,
    maxCustomDomains: 1,
    maxProviders: 10,
    maxRequestsPerMonth: 500_000,
    maxSeats: 1,
    maxVirtualKeys: 20
  },
  team: {
    analyticsRetentionDays: 90,
    hasAuditLogs: false,
    hasCustomDomains: true,
    hasGuardrails: true,
    hasTeams: true,
    hasWebhooks: true,
    maxBudgets: Number.POSITIVE_INFINITY,
    maxCustomDomains: 3,
    maxProviders: Number.POSITIVE_INFINITY,
    maxRequestsPerMonth: 2_000_000,
    maxSeats: 30,
    maxVirtualKeys: Number.POSITIVE_INFINITY
  }
} as const;
