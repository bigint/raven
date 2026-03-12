"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Clock, DollarSign, Zap } from "lucide-react";
import type { DateRange, Stats } from "../hooks/use-analytics";

interface UsageChartsProps {
  stats: Stats | null;
  loading: boolean;
  dateRange: DateRange;
  dateRangeOptions: { value: DateRange; label: string }[];
  onDateRangeChange: (range: DateRange) => void;
}

interface StatCard {
  bg: string;
  color: string;
  icon: LucideIcon;
  label: string;
  value: string;
}

const buildStatCards = (stats: Stats | null): StatCard[] => [
  {
    bg: "bg-blue-500/10",
    color: "text-blue-500",
    icon: Activity,
    label: "Total Requests",
    value: stats ? Number(stats.totalRequests).toLocaleString() : "\u2014"
  },
  {
    bg: "bg-green-500/10",
    color: "text-green-500",
    icon: DollarSign,
    label: "Total Cost",
    value: stats ? `$${Number(stats.totalCost).toFixed(4)}` : "\u2014"
  },
  {
    bg: "bg-orange-500/10",
    color: "text-orange-500",
    icon: Clock,
    label: "Avg Latency",
    value: stats ? `${Math.round(Number(stats.avgLatencyMs))}ms` : "\u2014"
  },
  {
    bg: "bg-purple-500/10",
    color: "text-purple-500",
    icon: Zap,
    label: "Cache Hit Rate",
    value: stats
      ? `${(Number(stats.cacheHitRate) * 100).toFixed(1)}%`
      : "\u2014"
  }
];

export const UsageCharts = ({
  stats,
  loading,
  dateRange,
  dateRangeOptions,
  onDateRangeChange
}: UsageChartsProps) => {
  const statCards = buildStatCards(stats);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track usage, costs, and performance across providers.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {dateRangeOptions.map((opt) => (
            <button
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={opt.value}
              onClick={() => onDateRangeChange(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
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
                {loading ? (
                  <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                ) : (
                  <span className="text-2xl font-bold">{card.value}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
