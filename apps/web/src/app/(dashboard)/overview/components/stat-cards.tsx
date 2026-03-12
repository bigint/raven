"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Clock, DollarSign, Zap } from "lucide-react";
import type { Stats } from "../hooks/use-overview";

interface StatCardsProps {
  stats: Stats | null;
  activeKeys: number;
  loading: boolean;
}

interface StatCard {
  bg: string;
  color: string;
  icon: LucideIcon;
  label: string;
  sub: string;
  value: string;
}

const buildStatCards = (
  stats: Stats | null,
  activeKeys: number
): StatCard[] => {
  const totalRequests = stats?.totalRequests ?? 0;
  const totalCost = Number(stats?.totalCost ?? 0);
  const avgLatency = Number(stats?.avgLatencyMs ?? 0);
  const cacheHitRate = Number(stats?.cacheHitRate ?? 0) * 100;

  return [
    {
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      icon: Activity,
      label: "Total Requests",
      sub: "Last 30 days",
      value: totalRequests.toLocaleString()
    },
    {
      bg: "bg-green-500/10",
      color: "text-green-500",
      icon: DollarSign,
      label: "Total Cost",
      sub: "Last 30 days",
      value: `$${totalCost.toFixed(2)}`
    },
    {
      bg: "bg-yellow-500/10",
      color: "text-yellow-500",
      icon: Clock,
      label: "Avg Latency",
      sub: "Across all requests",
      value: `${avgLatency.toFixed(0)}ms`
    },
    {
      bg: "bg-purple-500/10",
      color: "text-purple-500",
      icon: Zap,
      label: "Cache Hit Rate",
      sub: `${activeKeys} active keys`,
      value: `${cacheHitRate.toFixed(1)}%`
    }
  ];
};

export const StatCards = ({ stats, activeKeys, loading }: StatCardsProps) => {
  const statCards = buildStatCards(stats, activeKeys);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div className="rounded-xl border border-border p-5" key={stat.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <Icon className={`size-4 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
              ) : (
                <span className="text-2xl font-bold">{stat.value}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
};
