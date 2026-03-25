"use client";

import { Switch } from "@raven/ui";

interface SwitchFieldProps {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

export const SwitchField = ({
  checked,
  description,
  label,
  onCheckedChange
}: SwitchFieldProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="space-y-0.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
