export type Plan = 'free' | 'pro' | 'team' | 'enterprise'

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'

export interface PlanFeatures {
  readonly maxSeats: number
  readonly maxRequestsPerMonth: number
  readonly maxProviders: number
  readonly maxBudgets: number
  readonly maxVirtualKeys: number
  readonly analyticsRetentionDays: number
  readonly hasTeams: boolean
  readonly hasSSO: boolean
  readonly hasAuditLogs: boolean
  readonly hasGuardrails: boolean
}

export type BooleanFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends boolean ? K : never
}[keyof PlanFeatures]

export type NumericFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends number ? K : never
}[keyof PlanFeatures]

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    maxSeats: 1,
    maxRequestsPerMonth: 10_000,
    maxProviders: 2,
    maxBudgets: 1,
    maxVirtualKeys: 3,
    analyticsRetentionDays: 7,
    hasTeams: false,
    hasSSO: false,
    hasAuditLogs: false,
    hasGuardrails: false,
  },
  pro: {
    maxSeats: 1,
    maxRequestsPerMonth: 500_000,
    maxProviders: Infinity,
    maxBudgets: 10,
    maxVirtualKeys: 20,
    analyticsRetentionDays: 30,
    hasTeams: false,
    hasSSO: false,
    hasAuditLogs: false,
    hasGuardrails: true,
  },
  team: {
    maxSeats: 20,
    maxRequestsPerMonth: 2_000_000,
    maxProviders: Infinity,
    maxBudgets: Infinity,
    maxVirtualKeys: Infinity,
    analyticsRetentionDays: 90,
    hasTeams: true,
    hasSSO: false,
    hasAuditLogs: false,
    hasGuardrails: true,
  },
  enterprise: {
    maxSeats: Infinity,
    maxRequestsPerMonth: Infinity,
    maxProviders: Infinity,
    maxBudgets: Infinity,
    maxVirtualKeys: Infinity,
    analyticsRetentionDays: 365,
    hasTeams: true,
    hasSSO: true,
    hasAuditLogs: true,
    hasGuardrails: true,
  },
} as const
