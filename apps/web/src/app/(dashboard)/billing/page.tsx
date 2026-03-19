"use client";

import { PageHeader, Spinner } from "@raven/ui";
import { CreditCard } from "lucide-react";
import { PlanSelector } from "./components/plan-selector";
import { SubscriptionStatus } from "./components/subscription-status";
import { useBilling } from "./hooks/use-billing";

const BillingPage = () => {
  const {
    subscription,
    plans,
    billingInterval,
    setBillingInterval,
    upgrading,
    handlePlanAction,
    getPlanButtonLabel
  } = useBilling();

  return (
    <div>
      <PageHeader
        description="Manage your subscription and billing details."
        title="Billing"
      />

      <div className="space-y-8">
        {/* Subscription section */}
        {subscription.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {subscription.error.message}
          </div>
        )}
        {subscription.isPending ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <Spinner className="mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading subscription...
            </p>
          </div>
        ) : (
          subscription.data && (
            <SubscriptionStatus subscription={subscription.data} />
          )
        )}

        {/* Plans section */}
        {plans.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {plans.error.message}
          </div>
        )}
        {plans.isPending ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <Spinner className="mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading plans...
            </p>
          </div>
        ) : (
          <PlanSelector
            billingInterval={billingInterval}
            getPlanButtonLabel={getPlanButtonLabel}
            onIntervalChange={setBillingInterval}
            onPlanAction={handlePlanAction}
            plans={plans.data ?? []}
            subscription={subscription.data ?? null}
            upgrading={upgrading}
          />
        )}

        {!subscription.isPending &&
          !plans.isPending &&
          !subscription.data &&
          (plans.data ?? []).length === 0 && (
            <div className="rounded-xl border border-border p-12 text-center">
              <CreditCard className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No billing information available.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default BillingPage;
