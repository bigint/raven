"use client";

import { PROVIDER_LABELS } from "@raven/types";
import { EmptyState } from "@raven/ui";
import { Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ModelIcon } from "@/components/model-icon";
import { formatTimeAgo } from "@/lib/format";
import type { RecentRequest } from "../hooks/use-overview";

const getStatusColor = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return "bg-success";
  if (statusCode >= 400) return "bg-destructive";
  return "bg-warning";
};

interface RecentRequestsProps {
  readonly requests: RecentRequest[];
  readonly loading: boolean;
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div className="h-10 animate-pulse rounded-lg bg-muted" key={i} />
    ))}
  </div>
);

const RequestsEmptyState = () => (
  <EmptyState
    bordered={false}
    icon={<Activity className="size-8" />}
    title="No requests yet"
  />
);

export const RecentRequests = ({ requests, loading }: RecentRequestsProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Activity className="size-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold">Recent Requests</h2>
      </div>
      <Link
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        href="/requests"
      >
        View all
        <ArrowRight className="size-3" />
      </Link>
    </div>
    <div className="px-4 py-4 sm:px-6">
      {loading ? (
        <LoadingSkeleton />
      ) : requests.length === 0 ? (
        <RequestsEmptyState />
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <div
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              key={req.id}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex size-2 rounded-full ${getStatusColor(req.statusCode)}`}
                />
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <ModelIcon
                      model={req.model}
                      provider={req.provider}
                      size={14}
                    />
                    {PROVIDER_LABELS[req.provider] ?? req.provider}{" "}
                    <span className="text-muted-foreground">{req.model}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.latencyMs}ms &middot; $
                    {(Number(req.cost) || 0).toFixed(4)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(req.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
