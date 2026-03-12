"use client";

import { CreditCard } from "lucide-react";
import type { Subscription } from "../hooks/use-billing";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  canceled: "bg-muted text-muted-foreground",
  incomplete: "bg-orange-500/10 text-orange-600",
  past_due: "bg-yellow-500/10 text-yellow-600",
  trialing: "bg-blue-500/10 text-blue-600"
};

interface SubscriptionStatusProps {
  subscription: Subscription;
}

export const SubscriptionStatus = ({
  subscription
}: SubscriptionStatusProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center gap-3 border-b border-border px-6 py-4">
      <div className="rounded-lg bg-primary/10 p-2">
        <CreditCard className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Current Subscription</h2>
        <p className="text-xs text-muted-foreground">
          Your active plan details
        </p>
      </div>
    </div>
    <div className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">{subscription.planName}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[subscription.status] ?? "bg-muted text-muted-foreground"}`}
            >
              {subscription.status.replace("_", " ")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-muted-foreground">Period start</span>
            <span>
              {new Date(subscription.currentPeriodStart).toLocaleDateString()}
            </span>
            <span className="text-muted-foreground">Period end</span>
            <span>
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
          {subscription.cancelAtPeriodEnd && (
            <p className="text-sm text-yellow-600">
              Your subscription will cancel at the end of the current period.
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
);
