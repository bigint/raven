"use client";

import { Button, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";
import { SwitchField } from "./switch-field";

export const LoggingSettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [logRequestBodies, setLogRequestBodies] = useState(true);
  const [logResponseBodies, setLogResponseBodies] = useState(false);

  useEffect(() => {
    if (settings) {
      setLogRequestBodies(settings.log_request_bodies !== "false");
      setLogResponseBodies(settings.log_response_bodies === "true");
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
      log_request_bodies: String(logRequestBodies),
      log_response_bodies: String(logResponseBodies)
    });
  };

  const hasChanges =
    settings !== undefined &&
    (logRequestBodies !== (settings.log_request_bodies !== "false") ||
      logResponseBodies !== (settings.log_response_bodies === "true"));

  return (
    <div className="max-w-lg space-y-6">
      <SwitchField
        checked={logRequestBodies}
        description="Store full request payloads for debugging. Increases storage usage."
        label="Log Request Bodies"
        onCheckedChange={setLogRequestBodies}
      />

      <SwitchField
        checked={logResponseBodies}
        description="Store full response payloads. Can significantly increase storage usage."
        label="Log Response Bodies"
        onCheckedChange={setLogResponseBodies}
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
