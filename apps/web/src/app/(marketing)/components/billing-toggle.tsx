"use client";

import type { Plan } from "@raven/types";
import { PLAN_DETAILS } from "@raven/types";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TextMorph } from "torph/react";

interface PlanCard {
  readonly cta: string;
  readonly ctaHref: string;
  readonly features: readonly string[];
  readonly plan: Plan;
}

interface BillingToggleProps {
  readonly plans: readonly PlanCard[];
}

export const BillingToggle = ({ plans }: BillingToggleProps) => {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center gap-3 mt-8">
        <TextMorph
          as="span"
          className={`text-sm font-medium transition-colors ${yearly ? "text-muted-foreground" : "text-primary"}`}
        >
          Monthly
        </TextMorph>
        <button
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            yearly ? "bg-primary" : "bg-border"
          }`}
          onClick={() => setYearly(!yearly)}
          type="button"
        >
          <span
            className={`inline-block size-4 rounded-full bg-white transition-transform ${
              yearly ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <TextMorph
          as="span"
          className={`text-sm font-medium transition-colors ${yearly ? "text-primary" : "text-muted-foreground"}`}
        >
          {`Yearly${yearly ? " · Save 20%" : ""}`}
        </TextMorph>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
        {plans.map((plan) => {
          const details = PLAN_DETAILS[plan.plan];
          const monthlyPrice = details.priceMonthly;
          const yearlyPerMonth = Math.round(details.priceYearly / 12);
          const displayPrice = yearly ? yearlyPerMonth : monthlyPrice;

          return (
            <div
              className={`relative rounded-xl border p-6 flex flex-col ${
                details.isPopular
                  ? "border-primary shadow-lg"
                  : "border-border"
              }`}
              key={plan.plan}
            >
              {details.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{details.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {details.description}
                </p>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <TextMorph as="span" className="text-4xl font-bold">
                      {`$${displayPrice}`}
                    </TextMorph>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {yearly && details.priceYearly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed annually (${details.priceYearly}/yr)
                    </p>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    className="flex items-start gap-2 text-sm"
                    key={feature}
                  >
                    <Check className="size-4 text-success shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                className={`block text-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  details.isPopular
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border hover:bg-muted"
                }`}
                href={plan.ctaHref}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
};
