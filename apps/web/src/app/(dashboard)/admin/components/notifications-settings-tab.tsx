"use client";

import { Spinner } from "@raven/ui";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";
import { SwitchField } from "./switch-field";

export const NotificationsSettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

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

  const toggle = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: String(value) });
  };

  return (
    <div className="max-w-lg space-y-6">
      <SwitchField
        checked={settings?.email_notifications_enabled === "true"}
        description="Master toggle for all email notifications. Requires email settings to be configured."
        label="Email Notifications"
        onCheckedChange={(v) => toggle("email_notifications_enabled", v)}
      />

      <SwitchField
        checked={settings?.notify_on_budget_exceeded === "true"}
        description="Send an email to admins when a budget threshold is exceeded"
        label="Budget Exceeded Alerts"
        onCheckedChange={(v) => toggle("notify_on_budget_exceeded", v)}
      />

      <SwitchField
        checked={settings?.notify_on_provider_error_spike === "true"}
        description="Send an email to admins when a provider has an unusually high error rate"
        label="Provider Error Spike Alerts"
        onCheckedChange={(v) => toggle("notify_on_provider_error_spike", v)}
      />
    </div>
  );
};
