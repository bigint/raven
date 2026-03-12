"use client";

import { Activity, Clock, DollarSign, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { api } from "@/lib/api";

interface Stats {
  totalRequests: number;
  totalCost: string;
  avgLatencyMs: string;
  cacheHitRate: string;
}

interface UsageRow {
  provider: string;
  model: string;
  totalRequests: number;
  totalCost: string;
  totalInputTokens: string;
  totalOutputTokens: string;
  avgLatencyMs: string;
}

type DateRange = "7d" | "30d" | "90d";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  azure: "Azure",
  cohere: "Cohere",
  google: "Google",
  mistral: "Mistral",
  openai: "OpenAI"
};

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (range: DateRange) => {
    try {
      setLoading(true);
      setError(null);
      const rangeMs: Record<DateRange, number> = {
        "7d": 604_800_000,
        "30d": 2_592_000_000,
        "90d": 7_776_000_000
      };
      const from = new Date(Date.now() - rangeMs[range]).toISOString();
      const [statsData, usageData] = await Promise.all([
        api.get<Stats>(`/v1/analytics/stats?from=${from}`),
        api.get<UsageRow[]>(`/v1/analytics/usage?from=${from}`)
      ]);
      setStats(statsData);
      setUsage(usageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [fetchData, dateRange]);

  useEventStream({
    enabled: !loading,
    events: ["request.created"],
    onEvent: (data) => {
      const req = data as { provider: string; model: string; cost: string };
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalCost: (Number(prev.totalCost) + Number(req.cost)).toString(),
          totalRequests: prev.totalRequests + 1
        };
      });
      setUsage((prev) =>
        prev.map((row) =>
          row.provider === req.provider && row.model === req.model
            ? {
                ...row,
                totalCost: (
                  Number(row.totalCost) + Number(req.cost)
                ).toString(),
                totalRequests: row.totalRequests + 1
              }
            : row
        )
      );
    }
  });

  const statCards = [
    {
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      icon: Activity,
      label: "Total Requests",
      value: stats ? Number(stats.totalRequests).toLocaleString() : "—"
    },
    {
      bg: "bg-green-500/10",
      color: "text-green-500",
      icon: DollarSign,
      label: "Total Cost",
      value: stats ? `$${Number(stats.totalCost).toFixed(4)}` : "—"
    },
    {
      bg: "bg-orange-500/10",
      color: "text-orange-500",
      icon: Clock,
      label: "Avg Latency",
      value: stats ? `${Math.round(Number(stats.avgLatencyMs))}ms` : "—"
    },
    {
      bg: "bg-purple-500/10",
      color: "text-purple-500",
      icon: Zap,
      label: "Cache Hit Rate",
      value: stats ? `${(Number(stats.cacheHitRate) * 100).toFixed(1)}%` : "—"
    }
  ];

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
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Cards */}
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

      {/* Usage Breakdown Table */}
      <div>
        <h2 className="mb-4 text-base font-semibold">
          Usage by Provider & Model
        </h2>
        {loading ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading analytics...
            </p>
          </div>
        ) : usage.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground">
              No usage data for this period.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Provider
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Model
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Requests
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tokens
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row, idx) => (
                  <tr
                    className={`transition-colors hover:bg-muted/30 ${idx !== usage.length - 1 ? "border-b border-border" : ""}`}
                    key={`${row.provider}-${row.model}`}
                  >
                    <td className="px-5 py-4 font-medium">
                      {PROVIDER_LABELS[row.provider] ?? row.provider}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-muted-foreground">
                      {row.model}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {Number(row.totalRequests).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      ${Number(row.totalCost).toFixed(4)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(
                        Number(row.totalInputTokens) +
                        Number(row.totalOutputTokens)
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
