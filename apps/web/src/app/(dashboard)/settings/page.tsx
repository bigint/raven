"use client";

import { PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { CreateOrgForm } from "../profile/components/create-org-form";
import { OrgList } from "../profile/components/org-list";
import { PendingInvitations } from "../profile/components/pending-invitations";
import { ProfileForm } from "../profile/components/profile-form";
import {
  orgsQueryOptions,
  profileInvitationsQueryOptions,
  useAcceptInvitation,
  useCreateOrg,
  useDeclineInvitation
} from "../profile/hooks/use-profile";

export default function SettingsPage() {
  const orgsQuery = useQuery(orgsQueryOptions());
  const invitationsQuery = useQuery(profileInvitationsQueryOptions());

  const createOrg = useCreateOrg();
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const handleAccept = async (id: string) => {
    setRespondingTo(id);
    try {
      await acceptInvitation.mutateAsync(id);
    } finally {
      setRespondingTo(null);
    }
  };

  const handleDecline = async (id: string) => {
    setRespondingTo(id);
    try {
      await declineInvitation.mutateAsync(id);
    } finally {
      setRespondingTo(null);
    }
  };

  const activeOrgId = orgsQuery.data?.[0]?.id ?? null;

  return (
    <div>
      <PageHeader
        description="Manage your account, organizations, and invitations."
        title="Settings"
      />

      <div className="space-y-6">
        <ProfileForm />

        <OrgList
          activeOrgId={activeOrgId}
          onCreateOrg={() => setShowCreateOrgModal(true)}
          orgs={orgsQuery.data ?? []}
          orgsError={orgsQuery.isError ? orgsQuery.error.message : null}
          orgsLoading={orgsQuery.isLoading}
        />

        <PendingInvitations
          invitations={invitationsQuery.data ?? []}
          invitationsError={
            invitationsQuery.isError ? invitationsQuery.error.message : null
          }
          invitationsLoading={invitationsQuery.isLoading}
          onAcceptInvitation={handleAccept}
          onDeclineInvitation={handleDecline}
          respondingTo={respondingTo}
        />

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/30">
          <div className="flex items-center gap-3 border-b border-destructive/30 px-6 py-4">
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
          <div className="px-6 py-5">
            <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 px-4 py-4">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  cannot be undone.
                </p>
              </div>
              <button
                className="ml-4 shrink-0 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
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

      <CreateOrgForm
        onClose={() => setShowCreateOrgModal(false)}
        onSubmit={async (data) => {
          await createOrg.mutateAsync(data);
        }}
        open={showCreateOrgModal}
      />
    </div>
  );
}
