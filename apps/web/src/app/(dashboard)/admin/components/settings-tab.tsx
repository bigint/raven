"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";

export const SettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [retentionDays, setRetentionDays] = useState(365);
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");

  useEffect(() => {
    if (settings) {
      setRetentionDays(Number(settings.analytics_retention_days) || 365);
      setResendApiKey(settings.resend_api_key ?? "");
      setResendFromEmail(settings.resend_from_email ?? "");
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
      analytics_retention_days: String(retentionDays),
      resend_api_key: resendApiKey,
      resend_from_email: resendFromEmail
    });
  };

  const hasChanges =
    settings !== undefined &&
    (retentionDays !== (Number(settings.analytics_retention_days) || 365) ||
      resendApiKey !== (settings.resend_api_key ?? "") ||
      resendFromEmail !== (settings.resend_from_email ?? ""));

  return (
    <div className="max-w-lg space-y-6">
      <Input
        label="Instance Name"
        onChange={(e) => setInstanceName(e.target.value)}
        placeholder="My Raven Instance"
        value={instanceName}
      />

      <Input
        description="Number of days to retain analytics data"
        label="Analytics Retention (days)"
        min={1}
        onChange={(e) => setRetentionDays(Number(e.target.value))}
        type="number"
        value={retentionDays}
      />

      <div className="border-t pt-6">
        <h3 className="mb-4 text-sm font-medium">Email (Resend)</h3>
        <div className="space-y-4">
          <Input
            description="API key from resend.com for sending emails"
            label="Resend API Key"
            onChange={(e) => setResendApiKey(e.target.value)}
            placeholder="re_..."
            type="password"
            value={resendApiKey}
          />

          <Input
            description="Sender address for outgoing emails (e.g. Raven <noreply@yourdomain.com>)"
            label="From Email"
            onChange={(e) => setResendFromEmail(e.target.value)}
            placeholder="Raven <noreply@yourdomain.com>"
            value={resendFromEmail}
          />
        </div>
      </div>

      <Button
        disabled={!hasChanges || updateSettings.isPending}
        onClick={handleSave}
      >
        {updateSettings.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
};
