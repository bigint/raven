"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const plans = [
  {
    cta: "Get started free",
    ctaHref: "/sign-up",
    description: "For individuals exploring AI integrations.",
    features: [
      "1,000 requests/mo",
      "1 provider",
      "1 virtual key",
      "Community support"
    ],
    monthlyPrice: 0,
    name: "Free",
    popular: false,
    unit: "/mo",
    yearlyPrice: 0
  },
  {
    cta: "Start free trial",
    ctaHref: "/sign-up?plan=pro",
    description: "For developers shipping AI-powered products.",
    features: [
      "50,000 requests/mo",
      "Unlimited providers",
      "10 virtual keys",
      "Email support",
      "Analytics dashboard"
    ],
    monthlyPrice: 29,
    name: "Pro",
    popular: true,
    unit: "/mo",
    yearlyPrice: 23
  },
  {
    cta: "Start free trial",
    ctaHref: "/sign-up?plan=team",
    description: "For teams that need collaboration and control.",
    features: [
      "200,000 requests/mo",
      "Unlimited providers",
      "Unlimited virtual keys",
      "Priority support",
      "SSO",
      "Audit logs",
      "Team management"
    ],
    monthlyPrice: 49,
    name: "Team",
    popular: false,
    unit: "/seat/mo",
    yearlyPrice: 39
  },
  {
    cta: "Contact sales",
    ctaHref: "mailto:sales@raven.dev",
    description: "For organizations with custom requirements.",
    features: [
      "Unlimited requests",
      "Unlimited providers",
      "Unlimited virtual keys",
      "Dedicated support",
      "SLA",
      "Custom contracts",
      "On-prem option"
    ],
    monthlyPrice: null,
    name: "Enterprise",
    popular: false,
    unit: "",
    yearlyPrice: null
  }
];

const comparisonFeatures = [
  {
    enterprise: "Unlimited",
    free: "1,000",
    name: "Monthly requests",
    pro: "50,000",
    team: "200,000"
  },
  {
    enterprise: "Unlimited",
    free: "1",
    name: "Providers",
    pro: "Unlimited",
    team: "Unlimited"
  },
  {
    enterprise: "Unlimited",
    free: "1",
    name: "Virtual keys",
    pro: "10",
    team: "Unlimited"
  },
  { enterprise: true, free: false, name: "Analytics", pro: true, team: true },
  {
    enterprise: true,
    free: false,
    name: "Email support",
    pro: true,
    team: true
  },
  {
    enterprise: true,
    free: false,
    name: "Priority support",
    pro: false,
    team: true
  },
  {
    enterprise: true,
    free: false,
    name: "Dedicated support",
    pro: false,
    team: false
  },
  { enterprise: true, free: false, name: "SSO", pro: false, team: true },
  { enterprise: true, free: false, name: "Audit logs", pro: false, team: true },
  {
    enterprise: true,
    free: false,
    name: "Team management",
    pro: false,
    team: true
  },
  { enterprise: true, free: false, name: "SLA", pro: false, team: false },
  {
    enterprise: true,
    free: false,
    name: "Custom contracts",
    pro: false,
    team: false
  },
  {
    enterprise: true,
    free: false,
    name: "On-prem deployment",
    pro: false,
    team: false
  }
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="px-8 py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className={`text-sm font-medium ${yearly ? "text-muted-foreground" : "text-primary"}`}
            >
              Monthly
            </span>
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
            <span
              className={`text-sm font-medium ${yearly ? "text-primary" : "text-muted-foreground"}`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-success font-medium">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.popular ? "border-primary shadow-lg" : "border-border"
              }`}
              key={plan.name}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
                <div className="mt-4">
                  {plan.monthlyPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.unit}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">Custom</span>
                    </div>
                  )}
                  {yearly &&
                    plan.yearlyPrice !== null &&
                    plan.yearlyPrice > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed annually (${plan.yearlyPrice * 12}/yr)
                      </p>
                    )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li className="flex items-start gap-2 text-sm" key={feature}>
                    <Check className="size-4 text-success shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                className={`block text-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border hover:bg-muted"
                }`}
                href={plan.ctaHref}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-10">
            Compare plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 font-medium">Free</th>
                  <th className="text-center py-3 px-4 font-medium">Pro</th>
                  <th className="text-center py-3 px-4 font-medium">Team</th>
                  <th className="text-center py-3 px-4 font-medium">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr className="border-b border-border" key={feature.name}>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {feature.name}
                    </td>
                    {(["free", "pro", "team", "enterprise"] as const).map(
                      (tier) => {
                        const value = feature[tier];
                        return (
                          <td className="text-center py-3 px-4" key={tier}>
                            {typeof value === "boolean" ? (
                              value ? (
                                <Check className="size-4 text-success mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">
                                  &mdash;
                                </span>
                              )
                            ) : (
                              <span>{value}</span>
                            )}
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
