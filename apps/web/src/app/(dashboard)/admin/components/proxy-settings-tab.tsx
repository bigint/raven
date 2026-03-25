"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";

export const ProxySettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [rateLimitRpm, setRateLimitRpm] = useState(60);
  const [rateLimitRpd, setRateLimitRpd] = useState(1000);
  const [maxBodySize, setMaxBodySize] = useState(10);
  const [requestTimeout, setRequestTimeout] = useState(300);
  const [defaultMaxTokens, setDefaultMaxTokens] = useState(4096);

  useEffect(() => {
    if (settings) {
      setRateLimitRpm(Number(settings.global_rate_limit_rpm) || 60);
      setRateLimitRpd(Number(settings.global_rate_limit_rpd) || 1000);
      setMaxBodySize(Number(settings.max_request_body_size_mb) || 10);
      setRequestTimeout(Number(settings.request_timeout_seconds) || 300);
      setDefaultMaxTokens(Number(settings.default_max_tokens) || 4096);
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
      default_max_tokens: String(defaultMaxTokens),
      global_rate_limit_rpd: String(rateLimitRpd),
      global_rate_limit_rpm: String(rateLimitRpm),
      max_request_body_size_mb: String(maxBodySize),
      request_timeout_seconds: String(requestTimeout)
    });
  };

  const hasChanges =
    settings !== undefined &&
    (rateLimitRpm !== (Number(settings.global_rate_limit_rpm) || 60) ||
      rateLimitRpd !== (Number(settings.global_rate_limit_rpd) || 1000) ||
      maxBodySize !== (Number(settings.max_request_body_size_mb) || 10) ||
      requestTimeout !== (Number(settings.request_timeout_seconds) || 300) ||
      defaultMaxTokens !== (Number(settings.default_max_tokens) || 4096));

  return (
    <div className="max-w-lg space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          autoComplete="off"
          description="Requests per minute"
          label="Rate Limit (RPM)"
          min={0}
          name="rateLimitRpm"
          onChange={(e) => setRateLimitRpm(Number(e.target.value))}
          type="number"
          value={rateLimitRpm}
        />

        <Input
          autoComplete="off"
          description="Requests per day"
          label="Rate Limit (RPD)"
          min={0}
          name="rateLimitRpd"
          onChange={(e) => setRateLimitRpd(Number(e.target.value))}
          type="number"
          value={rateLimitRpd}
        />
      </div>

      <Input
        autoComplete="off"
        description="Maximum allowed request body size in megabytes"
        label="Max Request Body Size (MB)"
        min={1}
        name="maxBodySize"
        onChange={(e) => setMaxBodySize(Number(e.target.value))}
        type="number"
        value={maxBodySize}
      />

      <Input
        autoComplete="off"
        description="Maximum time to wait for an upstream provider response"
        label="Request Timeout (seconds)"
        min={5}
        name="requestTimeout"
        onChange={(e) => setRequestTimeout(Number(e.target.value))}
        type="number"
        value={requestTimeout}
      />

      <Input
        autoComplete="off"
        description="Default max output tokens when not specified in the request"
        label="Default Max Tokens"
        min={1}
        name="defaultMaxTokens"
        onChange={(e) => setDefaultMaxTokens(Number(e.target.value))}
        type="number"
        value={defaultMaxTokens}
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
