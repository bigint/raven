"use client";

import { Spinner } from "@raven/ui";
import { DollarSign, Hash, Users } from "lucide-react";
import { useAdminStats } from "../hooks/use-admin";

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading
}: {
  readonly label: string;
  readonly value: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly loading: boolean;
}) => (
  <div className="rounded-xl border border-border p-5">
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="size-4 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
    <div className="mt-3">
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      )}
    </div>
  </div>
);

export const OverviewTab = () => {
  const { data: stats, isPending, error } = useAdminStats();

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const tokenUsage = stats?.tokenUsage;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total Users"
          loading={isPending}
          value={stats?.totalUsers?.toLocaleString() ?? "0"}
        />
        <StatCard
          icon={Hash}
          label="Requests (30d)"
          loading={isPending}
          value={stats?.requests30d?.toLocaleString() ?? "0"}
        />
        <StatCard
          icon={DollarSign}
          label="Cost (30d)"
          loading={isPending}
          value={stats ? `$${Number(stats.cost30d).toFixed(2)}` : "$0.00"}
        />
      </div>

      {tokenUsage && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Token Usage (30d)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Prompt Tokens</p>
              <p className="mt-1 text-lg font-semibold">
                {tokenUsage.promptTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Completion Tokens</p>
              <p className="mt-1 text-lg font-semibold">
                {tokenUsage.completionTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="mt-1 text-lg font-semibold">
                {tokenUsage.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
