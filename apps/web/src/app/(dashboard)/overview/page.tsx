"use client";

import { PageHeader, Spinner } from "@raven/ui";
import { Key, Network, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { TextMorph } from "torph/react";
import { match } from "ts-pattern";
import { RecentRequests } from "./components/recent-requests";
import { StatCards } from "./components/stat-cards";
import { UsageChart } from "./components/usage-chart";
import { useOverview } from "./hooks/use-overview";

const OverviewPage = () => {
  const { stats, usage, requests, keys, providers } = useOverview();

  const keysData = keys.data ?? [];
  const providersData = providers.data ?? [];
  const activeKeys = keysData.filter((k) => k.isActive).length;
  const totalRequests = stats.data?.totalRequests ?? 0;
  const providerCount = providersData.length;

  return (
    <div>
      <PageHeader
        description="Here's what's happening across your organization."
        title="Overview"
      />

      {stats.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {stats.error.message}
        </div>
      )}
      <StatCards loading={stats.isPending} stats={stats.data ?? null} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}
        >
          {match(usage)
            .with({ isError: true }, ({ error }) => (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </div>
            ))
            .otherwise(() => (
              <UsageChart
                loading={usage.isPending}
                totalRequests={totalRequests}
                usage={usage.data ?? []}
              />
            ))}
        </Suspense>
        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}
        >
          {match(requests)
            .with({ isError: true }, ({ error }) => (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </div>
            ))
            .otherwise(() => (
              <RecentRequests
                loading={requests.isPending}
                requests={requests.data ?? []}
              />
            ))}
        </Suspense>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
            href="/providers"
          >
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Network className="size-4 text-orange-500" />
            </div>
            <div>
              {match(providers)
                .with({ isPending: true }, () => <Spinner className="size-4" />)
                .otherwise(() => (
                  <>
                    <TextMorph className="text-sm font-medium">
                      {providerCount > 0
                        ? `${providerCount} Providers`
                        : "Add Provider"}
                    </TextMorph>
                    <p className="text-xs text-muted-foreground">
                      {providerCount > 0
                        ? "Manage configurations"
                        : "Connect your first AI provider"}
                    </p>
                  </>
                ))}
            </div>
          </Link>
          <Link
            className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
            href="/keys"
          >
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Key className="size-4 text-purple-500" />
            </div>
            <div>
              {match(keys)
                .with({ isPending: true }, () => <Spinner className="size-4" />)
                .otherwise(() => (
                  <>
                    <TextMorph className="text-sm font-medium">
                      {activeKeys > 0
                        ? `${activeKeys} Active Keys`
                        : "Create Key"}
                    </TextMorph>
                    <p className="text-xs text-muted-foreground">
                      {activeKeys > 0
                        ? "Manage virtual keys"
                        : "Create a virtual API key"}
                    </p>
                  </>
                ))}
            </div>
          </Link>
          <Link
            className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
            href="/analytics"
          >
            <div className="rounded-lg bg-blue-500/10 p-2">
              <TrendingUp className="size-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Analytics</p>
              <p className="text-xs text-muted-foreground">
                View detailed usage analytics
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
