"use client";

import { Building2, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OrgSettings } from "../hooks/use-settings";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  canceled: "bg-muted text-muted-foreground",
  incomplete: "bg-orange-500/10 text-orange-600",
  past_due: "bg-yellow-500/10 text-yellow-600",
  trialing: "bg-blue-500/10 text-blue-600"
};

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
}: SettingsFormProps) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* General Section */}
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

      {/* Plan & Subscription Section */}
      <div className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <CreditCard className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Plan & Subscription</h2>
            <p className="text-xs text-muted-foreground">
              Your current plan and billing status
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Current Plan
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold capitalize">
                    {settings.plan}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Status
                </span>
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[settings.subscriptionStatus ?? "active"] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {(settings.subscriptionStatus ?? "active").replace(
                      "_",
                      " "
                    )}
                  </span>
                </div>
              </div>
            </div>
            <button
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              onClick={() => router.push("/billing")}
              type="button"
            >
              Manage Billing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
