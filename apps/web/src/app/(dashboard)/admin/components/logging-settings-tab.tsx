"use client";

import { Spinner } from "@raven/ui";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";
import { SwitchField } from "./switch-field";

export const LoggingSettingsTab = () => {
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
        checked={settings?.log_request_bodies === "true"}
        description="Store full request payloads for debugging. Increases storage usage."
        label="Log Request Bodies"
        onCheckedChange={(v) => toggle("log_request_bodies", v)}
      />

      <SwitchField
        checked={settings?.log_response_bodies === "true"}
        description="Store full response payloads. Can significantly increase storage usage."
        label="Log Response Bodies"
        onCheckedChange={(v) => toggle("log_response_bodies", v)}
      />
    </div>
  );
};
