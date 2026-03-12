"use client";

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
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-muted-foreground"
            htmlFor="org-name"
          >
            Organization Name
          </label>
          {isAdmin ? (
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              id="org-name"
              onChange={(e) => {
                onNameChange(e.target.value);
                onSaveErrorClear();
              }}
              type="text"
              value={editName}
            />
          ) : (
            <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
              {settings.name}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-muted-foreground"
            htmlFor="org-slug"
          >
            Slug
          </label>
          {isAdmin ? (
            <>
              <input
                className={`w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                  editSlug && !isSlugValid
                    ? "border-destructive"
                    : "border-input"
                }`}
                id="org-slug"
                onChange={(e) => {
                  onSlugChange(e.target.value.toLowerCase());
                  onSaveErrorClear();
                }}
                type="text"
                value={editSlug}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens. 3-50 characters.
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-sm">
              {settings.slug}
            </div>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="flex justify-end pt-1">
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={saving || !hasChanges || !isSlugValid}
            onClick={onSave}
            type="button"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  </div>
);
