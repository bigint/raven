"use client";

import { Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { RecentRequest } from "../hooks/use-overview";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI"
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getStatusColor = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return "bg-green-500";
  if (statusCode >= 400) return "bg-destructive";
  return "bg-yellow-500";
};

interface RecentRequestsProps {
  requests: RecentRequest[];
  loading: boolean;
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div className="h-10 animate-pulse rounded-lg bg-muted" key={i} />
    ))}
  </div>
);

const EmptyState = () => (
  <div className="py-6 text-center">
    <Activity className="mx-auto size-8 text-muted-foreground/30" />
    <p className="mt-2 text-sm text-muted-foreground">No requests yet</p>
  </div>
);

export const RecentRequests = ({ requests, loading }: RecentRequestsProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
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
    <div className="px-6 py-4">
      {loading ? (
        <LoadingSkeleton />
      ) : requests.length === 0 ? (
        <EmptyState />
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
                  <p className="text-sm font-medium">
                    {PROVIDER_LABELS[req.provider] ?? req.provider}{" "}
                    <span className="text-muted-foreground">{req.model}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.latencyMs}ms &middot; ${Number(req.cost).toFixed(4)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {timeAgo(req.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
