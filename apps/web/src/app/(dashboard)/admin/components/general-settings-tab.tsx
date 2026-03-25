"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";

export const GeneralSettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [instanceName, setInstanceName] = useState("Raven");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [retentionDays, setRetentionDays] = useState(365);

  useEffect(() => {
    if (settings) {
      setInstanceName(settings.instance_name || "Raven");
      setInstanceUrl(settings.instance_url || "");
      setRetentionDays(Number(settings.analytics_retention_days) || 365);
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
      instance_name: instanceName,
      instance_url: instanceUrl
    });
  };

  const hasChanges =
    settings !== undefined &&
    (instanceName !== (settings.instance_name || "Raven") ||
      instanceUrl !== (settings.instance_url || "") ||
      retentionDays !== (Number(settings.analytics_retention_days) || 365));

  return (
    <div className="max-w-lg space-y-6">
      <Input
        autoComplete="off"
        description="Display name for this Raven instance"
        label="Instance Name"
        name="instanceName"
        onChange={(e) => setInstanceName(e.target.value)}
        placeholder="Raven"
        value={instanceName}
      />

      <Input
        autoComplete="off"
        description="Base URL used in emails and webhook payloads"
        label="Instance URL"
        name="instanceUrl"
        onChange={(e) => setInstanceUrl(e.target.value)}
        placeholder="https://raven.example.com"
        type="url"
        value={instanceUrl}
      />

      <Input
        autoComplete="off"
        description="Number of days to retain analytics data"
        label="Analytics Retention (days)"
        min={1}
        name="retentionDays"
        onChange={(e) => setRetentionDays(Number(e.target.value))}
        type="number"
        value={retentionDays}
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
