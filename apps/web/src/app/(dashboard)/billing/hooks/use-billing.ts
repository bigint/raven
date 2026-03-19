"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

interface Subscription {
  readonly planId: string;
  readonly planName: string;
  readonly status: string;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
}

interface PlanFeature {
  readonly text: string;
  readonly included: boolean;
}

interface Plan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priceMonthly: number;
  readonly priceYearly: number;
  readonly features: PlanFeature[];
  readonly isPopular?: boolean;
}

type BillingInterval = "monthly" | "yearly";

const VALID_INTERVALS: BillingInterval[] = ["monthly", "yearly"];

export const subscriptionQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Subscription | null>("/v1/billing/subscription"),
    queryKey: ["billing", "subscription"]
  });

export const plansQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Plan[]>("/v1/billing/plans"),
    queryKey: ["billing", "plans"]
  });

export const useBilling = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const intervalParam = searchParams.get("interval") as BillingInterval | null;
  const billingInterval =
    intervalParam && VALID_INTERVALS.includes(intervalParam)
      ? intervalParam
      : "monthly";

  const setBillingInterval = (interval: BillingInterval) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("interval", interval);
    router.replace(`?${params.toString()}`);
  };

  const subscription = useQuery(subscriptionQueryOptions());
  const plans = useQuery(plansQueryOptions());

  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handlePlanAction = async (planId: string) => {
    try {
      setUpgrading(planId);
      // UI-only for now - would call upgrade/downgrade API
      await new Promise((resolve) => setTimeout(resolve, 800));
    } finally {
      setUpgrading(null);
    }
  };

  const getPlanButtonLabel = (plan: Plan): string => {
    const sub = subscription.data;
    const allPlans = plans.data ?? [];
    if (!sub) return "Get started";
    if (sub.planId === plan.id) return "Current plan";
    const currentPlan = allPlans.find((p) => p.id === sub.planId);
    if (!currentPlan) return "Switch plan";
    const currentPrice =
      billingInterval === "monthly"
        ? currentPlan.priceMonthly
        : currentPlan.priceYearly;
    const targetPrice =
      billingInterval === "monthly" ? plan.priceMonthly : plan.priceYearly;
    return targetPrice > currentPrice ? "Upgrade" : "Downgrade";
  };

  return {
    billingInterval,
    getPlanButtonLabel,
    handlePlanAction,
    plans,
    setBillingInterval,
    subscription,
    upgrading
  };
};

export type { BillingInterval, Plan, PlanFeature, Subscription };
