"use client";

import { Badge, Button, EmptyState, Spinner } from "@raven/ui";
import { Building2, Check, Clock, Mail, X } from "lucide-react";
import type { ProfileInvitation } from "../hooks/use-profile";
import { getRoleBadge } from "./org-list";

interface PendingInvitationsProps {
  invitations: ProfileInvitation[];
  invitationsError: string | null;
  invitationsLoading: boolean;
  onAcceptInvitation: (id: string) => void;
  onDeclineInvitation: (id: string) => void;
  respondingTo: string | null;
}

const PendingInvitations = ({
  invitations,
  invitationsError,
  invitationsLoading,
  onAcceptInvitation,
  onDeclineInvitation,
  respondingTo
}: PendingInvitationsProps) => (
  <div className="rounded-xl border border-border">
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
      <div className="rounded-lg bg-primary/10 p-2">
        <Mail className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Pending Invitations</h2>
        <p className="text-xs text-muted-foreground">
          Invitations to join organizations
        </p>
      </div>
    </div>
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      {invitationsError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {invitationsError}
        </div>
      )}
      {invitationsLoading ? (
        <div className="py-6 text-center">
          <Spinner className="mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading invitations...</p>
        </div>
      ) : invitations.length === 0 ? (
        <EmptyState
          bordered={false}
          icon={<Mail className="size-8" />}
          title="No pending invitations yet"
        />
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => {
            const badge = getRoleBadge(inv.role);
            const RoleIcon = badge.icon;
            return (
              <div
                className="flex flex-col gap-3 rounded-lg border border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={inv.id}
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.orgName}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <Badge variant={badge.className}>
                        <RoleIcon className="size-3" />
                        {inv.role}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={respondingTo === inv.id}
                    onClick={() => onDeclineInvitation(inv.id)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <X className="size-3.5" />
                    Decline
                  </Button>
                  <Button
                    disabled={respondingTo === inv.id}
                    onClick={() => onAcceptInvitation(inv.id)}
                    size="sm"
                    type="button"
                  >
                    <Check className="size-3.5" />
                    Accept
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export { PendingInvitations };
