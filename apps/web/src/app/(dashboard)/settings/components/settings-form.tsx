"use client";

import { Button, Input } from "@raven/ui";
import { Building2 } from "lucide-react";
import type { OrgSettings } from "../hooks/use-settings";

interface SettingsFormProps {
  settings: OrgSettings;
  editName: string;
  editSlug: string;
  isAdmin: boolean;
  isSlugValid: boolean;
  hasChanges: boolean;
  saving: boolean;
  saveError: string | null;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSaveErrorClear: () => void;
  onSave: () => void;
}

export const SettingsForm = ({
  settings,
  editName,
  editSlug,
  isAdmin,
  isSlugValid,
  hasChanges,
  saving,
  saveError,
  onNameChange,
  onSlugChange,
  onSaveErrorClear,
  onSave
}: SettingsFormProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center gap-3 border-b border-border px-6 py-4">
      <div className="rounded-lg bg-primary/10 p-2">
        <Building2 className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">General</h2>
        <p className="text-xs text-muted-foreground">
          Organization name and slug
        </p>
      </div>
    </div>
    <div className="space-y-4 px-6 py-5">
      {saveError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          {isAdmin ? (
            <Input
              id="org-name"
              label="Organization Name"
              onChange={(e) => {
                onNameChange(e.target.value);
                onSaveErrorClear();
              }}
              type="text"
              value={editName}
            />
          ) : (
            <>
              <label
                className="text-sm font-medium text-muted-foreground"
                htmlFor="org-name"
              >
                Organization Name
              </label>
              <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                {settings.name}
              </div>
            </>
          )}
        </div>
        <div className="space-y-1.5">
          {isAdmin ? (
            <Input
              className="font-mono"
              description="Lowercase letters, numbers, and hyphens. 3-50 characters."
              error={editSlug && !isSlugValid ? "Invalid slug" : null}
              id="org-slug"
              label="Slug"
              onChange={(e) => {
                onSlugChange(e.target.value.toLowerCase());
                onSaveErrorClear();
              }}
              type="text"
              value={editSlug}
            />
          ) : (
            <>
              <label
                className="text-sm font-medium text-muted-foreground"
                htmlFor="org-slug"
              >
                Slug
              </label>
              <div className="rounded-md border border-input bg-muted/50 px-3 py-2 font-mono text-sm">
                {settings.slug}
              </div>
            </>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="flex justify-end pt-1">
          <Button
            disabled={saving || !hasChanges || !isSlugValid}
            onClick={onSave}
            type="button"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  </div>
);
