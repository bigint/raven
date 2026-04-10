"use client";

import { Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, Hash, Target, TrendingUp } from "lucide-react";
import type { PeriodStats } from "../../hooks/use-collections";
import { collectionAnalyticsQueryOptions } from "../../hooks/use-collections";

const PeriodCard = ({
  label,
  period
}: {
  readonly label: string;
  readonly period: PeriodStats;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <h4 className="mb-3 text-xs font-medium text-muted-foreground">{label}</h4>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="size-3" />
          Queries
        </div>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">
          {period.query_count}
        </p>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          Avg Latency
        </div>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">
          {period.avg_latency_ms.toFixed(0)}
          <span className="text-xs font-normal text-muted-foreground">ms</span>
        </p>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="size-3" />
          Avg Score
        </div>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">
          {period.avg_score > 0
            ? `${(period.avg_score * 100).toFixed(1)}%`
            : "-"}
        </p>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Hash className="size-3" />
          Avg Results
        </div>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">
          {period.avg_result_count.toFixed(1)}
        </p>
      </div>
    </div>
  </div>
);

interface AnalyticsTabProps {
  readonly collectionId: string;
}

const AnalyticsTab = ({ collectionId }: AnalyticsTabProps) => {
  const { data, isLoading } = useQuery(
    collectionAnalyticsQueryOptions(collectionId)
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No analytics data available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <PeriodCard label="Last 24 Hours" period={data.period_24h} />
        <PeriodCard label="Last 7 Days" period={data.period_7d} />
        <PeriodCard label="Last 30 Days" period={data.period_30d} />
      </div>

      {/* Top queries */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <TrendingUp className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Top Queries (7 days)</h3>
        </div>
        {data.top_queries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No queries yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {data.top_queries.map((q, i) => (
              <div
                className="flex items-center justify-between px-4 py-2.5"
                key={q.query}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm">{q.query}</span>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {q.count}x
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { AnalyticsTab };
