"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";

export const WebhooksSettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [webhookTimeout, setWebhookTimeout] = useState(10);
  const [webhookRetryCount, setWebhookRetryCount] = useState(3);

  useEffect(() => {
    if (settings) {
      setWebhookTimeout(Number(settings.webhook_timeout_seconds) || 10);
      setWebhookRetryCount(Number(settings.webhook_retry_count) || 3);
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
      webhook_retry_count: String(webhookRetryCount),
      webhook_timeout_seconds: String(webhookTimeout)
    });
  };

  const hasChanges =
    settings !== undefined &&
    (webhookTimeout !== (Number(settings.webhook_timeout_seconds) || 10) ||
      webhookRetryCount !== (Number(settings.webhook_retry_count) || 3));

  return (
    <div className="max-w-lg space-y-6">
      <Input
        autoComplete="off"
        description="Maximum time to wait for a webhook endpoint to respond"
        label="Webhook Timeout (seconds)"
        min={1}
        name="webhookTimeout"
        onChange={(e) => setWebhookTimeout(Number(e.target.value))}
        type="number"
        value={webhookTimeout}
      />

      <Input
        autoComplete="off"
        description="Number of retry attempts when a webhook delivery fails"
        label="Retry Count"
        max={10}
        min={0}
        name="webhookRetryCount"
        onChange={(e) => setWebhookRetryCount(Number(e.target.value))}
        type="number"
        value={webhookRetryCount}
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
