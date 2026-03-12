"use client";

import { Building2, Check, Clock, Crown, Mail, Shield, User, X } from "lucide-react";
import { Badge, Button, DataTable, Spinner } from "@raven/ui";
import { setOrgId } from "@/lib/api";
import type { Organization, ProfileInvitation } from "../hooks/use-profile";

const DEFAULT_BADGE = {
  className: "neutral" as const,
  icon: User,
};

const ROLE_BADGES: Record<string, { className: "primary" | "neutral"; icon: typeof Crown }> = {
  admin: { className: "primary", icon: Shield },
  member: { className: "neutral", icon: User },
  owner: { className: "primary", icon: Crown },
  viewer: { className: "neutral", icon: User },
};

const getRoleBadge = (role: string) => ROLE_BADGES[role] ?? DEFAULT_BADGE;

interface OrgListProps {
  activeOrgId: string | null;
  invitations: ProfileInvitation[];
  invitationsError: string | null;
  invitationsLoading: boolean;
  onAcceptInvitation: (id: string) => void;
  onCreateOrg: () => void;
  onDeclineInvitation: (id: string) => void;
  orgs: Organization[];
  orgsError: string | null;
  orgsLoading: boolean;
  respondingTo: string | null;
}

const handleSwitchOrg = (orgId: string) => {
  setOrgId(orgId);
  window.location.reload();
};

const OrgList = ({
  activeOrgId,
  invitations,
  invitationsError,
  invitationsLoading,
  onAcceptInvitation,
  onCreateOrg,
  onDeclineInvitation,
  orgs,
  orgsError,
  orgsLoading,
  respondingTo,
}: OrgListProps) => (
  <div className="space-y-6">
    {/* My Organizations */}
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building2 className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">My Organizations</h2>
            <p className="text-xs text-muted-foreground">
              Organizations you belong to
            </p>
          </div>
        </div>
        <Button onClick={onCreateOrg}>
          <Building2 className="size-4" />
          Create Organization
        </Button>
      </div>
      <div className="px-6 py-5">
        {orgsError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {orgsError}
          </div>
        )}
        {orgsLoading ? (
          <Spinner />
        ) : orgs.length === 0 ? (
          <div className="py-8 text-center">
            <Building2 className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">No organizations yet.</p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Name",
                key: "name",
                render: (org) => (
                  <span className="font-medium">{org.name}</span>
                ),
              },
              {
                header: "Slug",
                key: "slug",
                render: (org) => (
                  <span className="font-mono text-xs text-muted-foreground">
                    {org.slug}
                  </span>
                ),
              },
              {
                header: "Role",
                key: "role",
                render: (org) => {
                  const badge = getRoleBadge(org.role);
                  const RoleIcon = badge.icon;
                  return (
                    <Badge variant={badge.className}>
                      <RoleIcon className="size-3" />
                      {org.role}
                    </Badge>
                  );
                },
              },
              {
                align: "right",
                header: "Actions",
                key: "actions",
                render: (org) => (
                  <div className="flex items-center justify-end gap-2">
                    {org.id === activeOrgId ? (
                      <Badge variant="success">
                        <Check className="size-3" />
                        Current
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleSwitchOrg(org.id)}
                        size="sm"
                        variant="secondary"
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={orgs}
            rowKey={(org) => org.id}
          />
        )}
      </div>
    </div>

    {/* Pending Invitations */}
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
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
      <div className="px-6 py-5">
        {invitationsError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {invitationsError}
          </div>
        )}
        {invitationsLoading ? (
          <Spinner />
        ) : invitations.length === 0 ? (
          <div className="py-8 text-center">
            <Mail className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No pending invitations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => {
              const badge = getRoleBadge(inv.role);
              const RoleIcon = badge.icon;
              return (
                <div
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-4"
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
                          Expires{" "}
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={respondingTo === inv.id}
                      onClick={() => onDeclineInvitation(inv.id)}
                      size="sm"
                      variant="secondary"
                    >
                      <X className="size-3.5" />
                      Decline
                    </Button>
                    <Button
                      disabled={respondingTo === inv.id}
                      onClick={() => onAcceptInvitation(inv.id)}
                      size="sm"
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
  </div>
);

export { OrgList };
