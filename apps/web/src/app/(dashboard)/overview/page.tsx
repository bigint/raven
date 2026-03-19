"use client";

import { PageHeader } from "@raven/ui";
import { Key, Network, TrendingUp } from "lucide-react";
import Link from "next/link";
import { TextMorph } from "torph/react";
import { RecentRequests } from "./components/recent-requests";
import { StatCards } from "./components/stat-cards";
import { UsageChart } from "./components/usage-chart";
import { useOverview } from "./hooks/use-overview";

const OverviewPage = () => {
  const { stats, usage, recentRequests, keys, providers, isLoading } =
    useOverview();

  const activeKeys = keys.filter((k) => k.isActive).length;
  const totalRequests = stats?.totalRequests ?? 0;
  const providerCount = providers.length;

  return (
    <div>
      <PageHeader
        description="Here's what's happening across your organization."
        title="Overview"
      />

      <StatCards loading={isLoading} stats={stats} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageChart
          loading={isLoading}
          totalRequests={totalRequests}
          usage={usage}
        />
        <RecentRequests loading={isLoading} requests={recentRequests} />
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
              <TextMorph className="text-sm font-medium">
                {activeKeys > 0 ? `${activeKeys} Active Keys` : "Create Key"}
              </TextMorph>
              <p className="text-xs text-muted-foreground">
                {activeKeys > 0
                  ? "Manage virtual keys"
                  : "Create a virtual API key"}
              </p>
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
