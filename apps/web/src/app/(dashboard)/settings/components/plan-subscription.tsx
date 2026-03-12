"use client";

import { CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OrgSettings } from "../hooks/use-settings";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  canceled: "bg-muted text-muted-foreground",
  incomplete: "bg-orange-500/10 text-orange-600",
  past_due: "bg-yellow-500/10 text-yellow-600",
  trialing: "bg-blue-500/10 text-blue-600"
};

interface PlanSubscriptionProps {
  settings: OrgSettings;
}

export const PlanSubscription = ({ settings }: PlanSubscriptionProps) => {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <CreditCard className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Plan & Subscription</h2>
          <p className="text-xs text-muted-foreground">
            Your current plan and billing status
          </p>
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Current Plan
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold capitalize">
                  {settings.plan}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Status
              </span>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[settings.subscriptionStatus ?? "active"] ?? "bg-muted text-muted-foreground"}`}
                >
                  {(settings.subscriptionStatus ?? "active").replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
          <button
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            onClick={() => router.push("/billing")}
            type="button"
          >
            Manage Billing
          </button>
        </div>
      </div>
    </div>
  );
};
