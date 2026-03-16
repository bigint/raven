"use client";

import type { PillTabOption } from "@raven/ui";
import { PillTabs, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingUp,
  Zap
} from "lucide-react";
import { useState } from "react";
import { CostChart } from "./components/cost-chart";
import { CostTable } from "./components/cost-table";
import {
  costByModelQueryOptions,
  costByProviderQueryOptions,
  dailyCostsQueryOptions,
  forecastQueryOptions
} from "./hooks/use-finops";

type Tab = "overview" | "by-model" | "by-provider";

const TAB_OPTIONS: PillTabOption<Tab>[] = [
  { label: "Overview", value: "overview" },
  { label: "By Model", value: "by-model" },
  { label: "By Provider", value: "by-provider" }
];

interface StatCard {
  bg: string;
  color: string;
  icon: LucideIcon;
  label: string;
  value: string;
}

const FinOpsPage = () => {
  const [tab, setTab] = useState<Tab>("overview");

  const forecastQuery = useQuery(forecastQueryOptions());
  const dailyCostsQuery = useQuery(dailyCostsQueryOptions(30));
  const modelCostsQuery = useQuery(costByModelQueryOptions());
  const providerCostsQuery = useQuery(costByProviderQueryOptions());

  const forecast = forecastQuery.data ?? null;
  const isLoading = forecastQuery.isPending || dailyCostsQuery.isPending;

  const statCards: StatCard[] = [
    {
      bg: "bg-green-500/10",
      color: "text-green-500",
      icon: DollarSign,
      label: "Current Month Spend",
      value: forecast ? `$${forecast.currentSpend.toFixed(2)}` : "\u2014"
    },
    {
      bg: "bg-purple-500/10",
      color: "text-purple-500",
      icon: TrendingUp,
      label: "Projected Spend",
      value: forecast ? `$${forecast.projectedSpend.toFixed(2)}` : "\u2014"
    },
    {
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      icon: Zap,
      label: "Daily Rate",
      value: forecast ? `$${forecast.dailyRate.toFixed(2)}` : "\u2014"
    },
    {
      bg: "bg-orange-500/10",
      color: "text-orange-500",
      icon: Calendar,
      label: "Days Remaining",
      value: forecast ? String(forecast.daysRemaining) : "\u2014"
    }
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">FinOps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and forecast AI spending across models and providers.
          </p>
        </div>
        <PillTabs onChange={setTab} options={TAB_OPTIONS} value={tab} />
      </div>

      {tab === "overview" && (
        <>
          {forecast?.projectedOverrun && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                Projected budget overrun
                {forecast.projectedOverrunDate
                  ? ` on ${forecast.projectedOverrunDate}`
                  : ""}
                . Current daily rate: ${forecast.dailyRate.toFixed(2)}/day.
              </span>
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  className="rounded-xl border border-border p-5"
                  key={card.label}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {card.label}
                    </p>
                    <div className={`rounded-lg p-2 ${card.bg}`}>
                      <Icon className={`size-4 ${card.color}`} />
                    </div>
                  </div>
                  <div className="mt-3">
                    {isLoading ? (
                      <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                    ) : (
                      <span className="text-2xl font-bold">{card.value}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {dailyCostsQuery.isPending ? (
            <div className="rounded-xl border border-border p-12 text-center">
              <Spinner className="mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Loading daily costs...
              </p>
            </div>
          ) : (
            <CostChart data={dailyCostsQuery.data ?? []} />
          )}
        </>
      )}

      {tab === "by-model" && (
        <CostTable
          data={modelCostsQuery.data ?? null}
          label="Model"
          loading={modelCostsQuery.isPending}
        />
      )}

      {tab === "by-provider" && (
        <CostTable
          data={providerCostsQuery.data ?? null}
          label="Provider"
          loading={providerCostsQuery.isPending}
        />
      )}
    </div>
  );
};

export default FinOpsPage;
