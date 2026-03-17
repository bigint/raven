"use client";

import { Badge } from "@raven/ui";
import { Activity, Building2, DollarSign, Users } from "lucide-react";
import { TextMorph } from "torph/react";
import { useAdminStats } from "../hooks/use-admin";

const AdminOverviewPage = () => {
  const { data: stats, isPending } = useAdminStats();

  const cards = [
    {
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      icon: Users,
      label: "Total Users",
      value: stats?.totalUsers.toLocaleString() ?? "0"
    },
    {
      bg: "bg-purple-500/10",
      color: "text-purple-500",
      icon: Building2,
      label: "Organizations",
      value: stats?.totalOrgs.toLocaleString() ?? "0"
    },
    {
      bg: "bg-green-500/10",
      color: "text-green-500",
      icon: Activity,
      label: "Requests (30d)",
      value: stats?.totalRequests.toLocaleString() ?? "0"
    },
    {
      bg: "bg-yellow-500/10",
      color: "text-yellow-500",
      icon: DollarSign,
      label: "Cost (30d)",
      value: `$${Number(stats?.totalCost ?? 0).toFixed(2)}`
    }
  ];

  const planDistribution = stats?.planDistribution ?? {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide statistics and insights.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              className="rounded-xl border border-border p-5"
              key={card.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`size-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                {isPending ? (
                  <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                ) : (
                  <TextMorph className="text-2xl font-bold tabular-nums">
                    {card.value}
                  </TextMorph>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-border p-5">
        <h2 className="mb-4 text-sm font-semibold">Token Usage (30d)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Input", value: stats?.totalInputTokens ?? 0 },
            { label: "Output", value: stats?.totalOutputTokens ?? 0 },
            { label: "Reasoning", value: stats?.totalReasoningTokens ?? 0 },
            { label: "Cached", value: stats?.totalCachedTokens ?? 0 },
            {
              label: "Total",
              value:
                (stats?.totalInputTokens ?? 0) +
                (stats?.totalOutputTokens ?? 0) +
                (stats?.totalReasoningTokens ?? 0)
            }
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {isPending ? (
                <div className="mt-1 h-6 w-16 animate-pulse rounded-md bg-muted" />
              ) : (
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {item.value.toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {Object.keys(planDistribution).length > 0 && (
        <div className="mt-8 rounded-xl border border-border p-5">
          <h2 className="mb-4 text-sm font-semibold">Plan Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(planDistribution).map(([plan, count]) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2"
                key={plan}
              >
                <Badge variant="primary">{plan}</Badge>
                <span className="text-lg font-semibold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverviewPage;
