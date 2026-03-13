"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

interface Subscription {
  planId: string;
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
  isPopular?: boolean;
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

  const subscriptionQuery = useQuery(subscriptionQueryOptions());
  const plansQuery = useQuery(plansQueryOptions());

  const [upgrading, setUpgrading] = useState<string | null>(null);

  const isLoading = subscriptionQuery.isPending || plansQuery.isPending;
  const error =
    subscriptionQuery.error?.message ?? plansQuery.error?.message ?? null;

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
    const subscription = subscriptionQuery.data;
    const plans = plansQuery.data ?? [];
    if (!subscription) return "Get started";
    if (subscription.planId === plan.id) return "Current plan";
    const currentPlan = plans.find((p) => p.id === subscription.planId);
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
    error,
    getPlanButtonLabel,
    handlePlanAction,
    isLoading,
    plans: plansQuery.data ?? [],
    setBillingInterval,
    subscription: subscriptionQuery.data ?? null,
    upgrading
  };
};

export type { BillingInterval, Plan, PlanFeature, Subscription };
