"use client";

import { PageHeader } from "@raven/ui";
import { AlertTriangle } from "lucide-react";
import { ProfileForm } from "./components/profile-form";

const ProfilePage = () => {
  return (
    <div>
      <PageHeader description="Manage your profile settings." title="Profile" />

      <div className="space-y-6">
        <ProfileForm />

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/30">
          <div className="flex items-center gap-3 border-b border-destructive/30 px-4 py-4 sm:px-6">
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-destructive">
                Danger Zone
              </h2>
              <p className="text-xs text-muted-foreground">
                Irreversible and destructive actions
              </p>
            </div>
          </div>
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  cannot be undone.
                </p>
              </div>
              <button
                className="shrink-0 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled
                title="Coming soon"
                type="button"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
