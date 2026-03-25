"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { useEffect, useState } from "react";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";
import { SwitchField } from "./switch-field";

export const SecuritySettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [signupEnabled, setSignupEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(24);
  const [passwordMinLength, setPasswordMinLength] = useState(8);

  useEffect(() => {
    if (settings) {
      setSignupEnabled(settings.signup_enabled !== "false");
      setSessionTimeout(Number(settings.session_timeout_hours) || 24);
      setPasswordMinLength(Number(settings.password_min_length) || 8);
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
      password_min_length: String(passwordMinLength),
      session_timeout_hours: String(sessionTimeout),
      signup_enabled: String(signupEnabled)
    });
  };

  const hasChanges =
    settings !== undefined &&
    (signupEnabled !== (settings.signup_enabled !== "false") ||
      sessionTimeout !== (Number(settings.session_timeout_hours) || 24) ||
      passwordMinLength !== (Number(settings.password_min_length) || 8));

  return (
    <div className="max-w-lg space-y-6">
      <SwitchField
        checked={signupEnabled}
        description="Allow new users to register. When disabled, only admins can invite users."
        label="User Registration"
        onCheckedChange={setSignupEnabled}
      />

      <Input
        autoComplete="off"
        description="Automatically sign out users after this period of inactivity"
        label="Session Timeout (hours)"
        min={1}
        name="sessionTimeout"
        onChange={(e) => setSessionTimeout(Number(e.target.value))}
        type="number"
        value={sessionTimeout}
      />

      <Input
        autoComplete="off"
        description="Minimum number of characters required for user passwords"
        label="Minimum Password Length"
        min={6}
        name="passwordMinLength"
        onChange={(e) => setPasswordMinLength(Number(e.target.value))}
        type="number"
        value={passwordMinLength}
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
