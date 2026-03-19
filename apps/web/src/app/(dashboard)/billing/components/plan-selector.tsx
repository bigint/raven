"use client";

import { PillTabs } from "@raven/ui";
import { Check, Zap } from "lucide-react";
import type { BillingInterval, Plan, Subscription } from "../hooks/use-billing";

interface PlanSelectorProps {
  readonly plans: Plan[];
  readonly subscription: Subscription | null;
  readonly billingInterval: BillingInterval;
  readonly upgrading: string | null;
  readonly onIntervalChange: (interval: BillingInterval) => void;
  readonly onPlanAction: (planId: string) => void;
  readonly getPlanButtonLabel: (plan: Plan) => string;
}

export const PlanSelector = ({
  plans,
  subscription,
  billingInterval,
  upgrading,
  onIntervalChange,
  onPlanAction,
  getPlanButtonLabel
}: PlanSelectorProps) => {
  if (plans.length === 0) return null;

  const sortedPlans = [...plans].sort(
    (a, b) => a.priceMonthly - b.priceMonthly
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Available Plans</h2>
        <PillTabs
          onChange={(v) => onIntervalChange(v as BillingInterval)}
          options={[
            { label: "Monthly", value: "monthly" },
            {
              extra: (
                <span className="ml-1.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-xs text-green-600">
                  Save 20%
                </span>
              ),
              label: "Yearly",
              value: "yearly"
            }
          ]}
          value={billingInterval}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sortedPlans.map((plan) => {
          const isCurrent = subscription?.planId === plan.id;
          const price =
            billingInterval === "monthly"
              ? plan.priceMonthly
              : plan.priceYearly;
          const buttonLabel = getPlanButtonLabel(plan);

          return (
            <div
              className={`relative rounded-xl border p-6 ${
                plan.isPopular
                  ? "border-primary shadow-sm"
                  : isCurrent
                    ? "border-primary/50 bg-primary/5"
                    : "border-border"
              }`}
              key={plan.id}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    <Zap className="size-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">
                    /{billingInterval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                {billingInterval === "yearly" && plan.priceMonthly > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ${(price / 12).toFixed(0)}/mo billed annually
                  </p>
                )}
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    className={`flex items-start gap-2 text-sm ${
                      feature.included
                        ? "text-foreground"
                        : "text-muted-foreground line-through"
                    }`}
                    key={feature.text}
                  >
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${feature.included ? "text-green-500" : "text-muted-foreground"}`}
                    />
                    {feature.text}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity ${
                  isCurrent
                    ? "cursor-default bg-muted text-muted-foreground"
                    : plan.isPopular
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border hover:bg-accent"
                } disabled:opacity-50`}
                disabled={isCurrent || upgrading === plan.id}
                onClick={() => !isCurrent && onPlanAction(plan.id)}
                type="button"
              >
                {upgrading === plan.id ? "Processing..." : buttonLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
