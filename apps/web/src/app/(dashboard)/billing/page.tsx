"use client";

import { CreditCard } from "lucide-react";
import { PlanSelector } from "./components/plan-selector";
import { SubscriptionStatus } from "./components/subscription-status";
import { useBilling } from "./hooks/use-billing";

const BillingPage = () => {
  const {
    subscription,
    plans,
    isLoading,
    error,
    billingInterval,
    setBillingInterval,
    upgrading,
    handlePlanAction,
    getPlanButtonLabel
  } = useBilling();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading billing...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {subscription && <SubscriptionStatus subscription={subscription} />}

          <PlanSelector
            billingInterval={billingInterval}
            getPlanButtonLabel={getPlanButtonLabel}
            onIntervalChange={setBillingInterval}
            onPlanAction={handlePlanAction}
            plans={plans}
            subscription={subscription}
            upgrading={upgrading}
          />

          {!subscription && plans.length === 0 && (
            <div className="rounded-xl border border-border p-12 text-center">
              <CreditCard className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No billing information available.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillingPage;
