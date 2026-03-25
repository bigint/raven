"use client";

import { Button, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";
import { SwitchField } from "./switch-field";

export const NotificationsSettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [budgetNotify, setBudgetNotify] = useState(true);
  const [errorSpikeNotify, setErrorSpikeNotify] = useState(true);

  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.email_notifications_enabled === "true");
      setBudgetNotify(settings.notify_on_budget_exceeded !== "false");
      setErrorSpikeNotify(settings.notify_on_provider_error_spike !== "false");
    }
  }, [settings]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const handleSave = () => {
    updateSettings.mutate({
      email_notifications_enabled: String(emailEnabled),
      notify_on_budget_exceeded: String(budgetNotify),
      notify_on_provider_error_spike: String(errorSpikeNotify)
    });
  };

  const hasChanges =
    settings !== undefined &&
    (emailEnabled !== (settings.email_notifications_enabled === "true") ||
      budgetNotify !== (settings.notify_on_budget_exceeded !== "false") ||
      errorSpikeNotify !==
        (settings.notify_on_provider_error_spike !== "false"));

  return (
    <div className="max-w-lg space-y-6">
      <SwitchField
        checked={emailEnabled}
        description="Master toggle for all email notifications. Requires email settings to be configured."
        label="Email Notifications"
        onCheckedChange={setEmailEnabled}
      />

      <SwitchField
        checked={budgetNotify}
        description="Send an email to admins when a budget threshold is exceeded"
        label="Budget Exceeded Alerts"
        onCheckedChange={setBudgetNotify}
      />

      <SwitchField
        checked={errorSpikeNotify}
        description="Send an email to admins when a provider has an unusually high error rate"
        label="Provider Error Spike Alerts"
        onCheckedChange={setErrorSpikeNotify}
      />

      <Button
        disabled={!hasChanges || updateSettings.isPending}
        onClick={handleSave}
      >
        {updateSettings.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
};
