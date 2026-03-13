"use client";

import { Database, HardDrive, TrendingUp, XCircle } from "lucide-react";
import { TextMorph } from "torph/react";
import type { CacheStats as CacheStatsData } from "../hooks/use-analytics";

interface CacheStatsProps {
  cache: CacheStatsData | null;
  loading: boolean;
}

export const CacheStats = ({ cache, loading }: CacheStatsProps) => {
  const cards = [
    {
      bg: "bg-emerald-500/10",
      color: "text-emerald-500",
      icon: TrendingUp,
      label: "Cache Hit Rate",
      value: cache ? `${(Number(cache.hitRate) * 100).toFixed(1)}%` : "\u2014"
    },
    {
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      icon: Database,
      label: "Total Requests",
      value: cache ? cache.totalRequests.toLocaleString() : "\u2014"
    },
    {
      bg: "bg-green-500/10",
      color: "text-green-500",
      icon: HardDrive,
      label: "Cache Hits",
      value: cache ? cache.cacheHits.toLocaleString() : "\u2014"
    },
    {
      bg: "bg-red-500/10",
      color: "text-red-500",
      icon: XCircle,
      label: "Cache Misses",
      value: cache ? cache.cacheMisses.toLocaleString() : "\u2014"
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-base font-semibold">Cache Performance</h2>
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
                {loading ? (
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

      {!loading && cache && cache.daily.length > 0 && (
        <div className="mt-4 rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Date
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hits
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Misses
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hit Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {cache.daily.map((row, idx) => {
                const rate =
                  row.total > 0
                    ? ((row.hits / row.total) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr
                    className={`transition-colors hover:bg-muted/30 ${idx !== cache.daily.length - 1 ? "border-b border-border" : ""}`}
                    key={row.date}
                  >
                    <td className="px-5 py-4 font-medium">{row.date}</td>
                    <td className="px-5 py-4 text-right">
                      {row.total.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-green-500">
                      {row.hits.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-red-500">
                      {row.misses.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
