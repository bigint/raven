import type { Database } from "@raven/db";
import { PLAN_DETAILS, PLAN_FEATURES } from "@raven/types";
import type { Context } from "hono";

export { PLAN_DETAILS };

export const getPlans = (_db: Database) => async (c: Context) => {
  const plans = Object.entries(PLAN_FEATURES).map(([plan, features]) => {
    const details = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS];
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
        text: `${features.maxBudgets === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxBudgets} ${features.maxBudgets === 1 ? "budget" : "budgets"}`
      },
      {
        included: true,
        text: `${features.maxSeats === Number.POSITIVE_INFINITY ? "Unlimited" : features.maxSeats} ${features.maxSeats === 1 ? "seat" : "seats"}`
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
