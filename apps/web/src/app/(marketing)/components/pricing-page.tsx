import type { Plan } from "@raven/types";
import { PLAN_DETAILS, PLAN_FEATURES } from "@raven/types";
import { Check } from "lucide-react";
import { BillingToggle } from "./billing-toggle";

const fmt = new Intl.NumberFormat("en-US");

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "Unlimited";
  }
  return fmt.format(value);
};

const formatFeatureLine = (
  value: number,
  singular: string,
  plural: string
): string => {
  if (!Number.isFinite(value)) {
    return `Unlimited ${plural}`;
  }
  return `${fmt.format(value)} ${value === 1 ? singular : plural}`;
};

const buildPlanFeatures = (plan: Plan): string[] => {
  const f = PLAN_FEATURES[plan];
  const lines: string[] = [
    formatFeatureLine(f.maxRequestsPerMonth, "request/mo", "requests/mo"),
    formatFeatureLine(f.maxProviders, "provider", "providers"),
    formatFeatureLine(f.maxVirtualKeys, "virtual key", "virtual keys")
  ];

  if (f.hasGuardrails) lines.push("Guardrails");
  if (f.hasModelAliases) lines.push("Model aliases");
  if (f.hasWebhooks) lines.push("Webhooks");
  if (f.hasAdoption) lines.push("Adoption analytics");
  if (f.hasAuditLogs) lines.push("Audit logs");
  if (f.maxSeats > 1) {
    lines.push(
      Number.isFinite(f.maxSeats)
        ? `Up to ${fmt.format(f.maxSeats)} seats`
        : "Unlimited seats"
    );
  }
  lines.push(
    `${formatNumber(f.analyticsRetentionDays)}-day analytics retention`
  );

  return lines;
};

const plans: ReadonlyArray<{
  readonly cta: string;
  readonly ctaHref: string;
  readonly features: readonly string[];
  readonly plan: Plan;
}> = [
  {
    cta: "Get started free",
    ctaHref: "/sign-up",
    features: buildPlanFeatures("free"),
    plan: "free"
  },
  {
    cta: "Start free trial",
    ctaHref: "/sign-up?plan=pro",
    features: buildPlanFeatures("pro"),
    plan: "pro"
  },
  {
    cta: "Start free trial",
    ctaHref: "/sign-up?plan=team",
    features: buildPlanFeatures("team"),
    plan: "team"
  },
  {
    cta: "Contact sales",
    ctaHref: "mailto:sales@raven.dev",
    features: buildPlanFeatures("enterprise"),
    plan: "enterprise"
  }
];

const PLAN_ORDER: readonly Plan[] = ["free", "pro", "team", "enterprise"];

const numericRow = (
  name: string,
  key: keyof {
    [K in keyof (typeof PLAN_FEATURES)["free"]]: (typeof PLAN_FEATURES)["free"][K] extends number
      ? K
      : never;
  }
): {
  name: string;
  free: string;
  pro: string;
  team: string;
  enterprise: string;
} => ({
  enterprise: formatNumber(PLAN_FEATURES.enterprise[key] as number),
  free: formatNumber(PLAN_FEATURES.free[key] as number),
  name,
  pro: formatNumber(PLAN_FEATURES.pro[key] as number),
  team: formatNumber(PLAN_FEATURES.team[key] as number)
});

const booleanRow = (
  name: string,
  key: keyof {
    [K in keyof (typeof PLAN_FEATURES)["free"]]: (typeof PLAN_FEATURES)["free"][K] extends boolean
      ? K
      : never;
  }
): {
  name: string;
  free: boolean;
  pro: boolean;
  team: boolean;
  enterprise: boolean;
} => ({
  enterprise: PLAN_FEATURES.enterprise[key] as boolean,
  free: PLAN_FEATURES.free[key] as boolean,
  name,
  pro: PLAN_FEATURES.pro[key] as boolean,
  team: PLAN_FEATURES.team[key] as boolean
});

const comparisonFeatures: ReadonlyArray<{
  readonly name: string;
  readonly free: string | boolean;
  readonly pro: string | boolean;
  readonly team: string | boolean;
  readonly enterprise: string | boolean;
}> = [
  numericRow("Monthly requests", "maxRequestsPerMonth"),
  numericRow("Providers", "maxProviders"),
  numericRow("Virtual keys", "maxVirtualKeys"),
  numericRow("Seats", "maxSeats"),
  numericRow("Analytics retention (days)", "analyticsRetentionDays"),
  numericRow("Budgets", "maxBudgets"),
  booleanRow("Guardrails", "hasGuardrails"),
  booleanRow("Model aliases", "hasModelAliases"),
  booleanRow("Webhooks", "hasWebhooks"),
  booleanRow("Adoption analytics", "hasAdoption"),
  booleanRow("Audit logs", "hasAuditLogs")
];

export const PricingPageContent = () => {
  return (
    <div className="px-4 py-16 sm:px-8 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          <BillingToggle plans={plans} />
        </div>

        <div className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-10">
            Compare plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground">
                    Feature
                  </th>
                  {PLAN_ORDER.map((tier) => (
                    <th
                      className="text-center py-3 px-4 font-medium"
                      key={tier}
                    >
                      {PLAN_DETAILS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr className="border-b border-border" key={feature.name}>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {feature.name}
                    </td>
                    {PLAN_ORDER.map((tier) => {
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
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
