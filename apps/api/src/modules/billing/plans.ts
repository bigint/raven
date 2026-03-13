import type { Database } from "@raven/db";
import { PLAN_FEATURES } from "@raven/types";
import type { Context } from "hono";

export const PLAN_DETAILS: Record<
  string,
  {
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    isPopular?: boolean;
  }
> = {
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

export const getPlans = (_db: Database) => async (c: Context) => {
  const plans = Object.entries(PLAN_FEATURES).map(([plan, features]) => {
    const details = PLAN_DETAILS[plan];
    const featureList = [
      {
        included: true,
        text: `${features.maxRequestsPerMonth === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxRequestsPerMonth.toLocaleString()} requests/month`
      },
      {
        included: true,
        text: `${features.maxProviders === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxProviders} providers`
      },
      {
        included: true,
        text: `${features.maxVirtualKeys === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxVirtualKeys} virtual keys`
      },
      {
        included: true,
        text: `${features.maxBudgets === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxBudgets} budgets`
      },
      {
        included: true,
        text: `${features.maxSeats === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxSeats} seats`
      },
      {
        included: true,
        text: `${features.analyticsRetentionDays}-day analytics retention`
      },
      { included: features.hasTeams, text: "Team management" },
      { included: features.hasAuditLogs, text: "Audit logs" },
      { included: features.hasGuardrails, text: "Guardrails" }
    ];

    return {
      description: details?.description ?? "",
      features: featureList,
      id: plan,
      isPopular: details?.isPopular ?? false,
      name: details?.name ?? plan,
      priceMonthly: details?.priceMonthly ?? 0,
      priceYearly: details?.priceYearly ?? 0
    };
  });

  return c.json(plans);
};
