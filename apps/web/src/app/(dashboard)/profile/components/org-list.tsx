"use client";

import { Building2, Check, Crown, Shield, User } from "lucide-react";
import { Badge, Button, DataTable, Spinner } from "@raven/ui";
import { setOrgId } from "@/lib/api";
import type { Organization } from "../hooks/use-profile";

const ROLE_BADGES: Record<string, { className: "primary" | "neutral"; icon: typeof Crown }> = {
  admin: { className: "primary", icon: Shield },
  member: { className: "neutral", icon: User },
  owner: { className: "primary", icon: Crown },
  viewer: { className: "neutral", icon: User },
};

const getRoleBadge = (role: string) =>
  ROLE_BADGES[role] ?? { className: "neutral" as const, icon: User };

interface OrgListProps {
  activeOrgId: string | null;
  onCreateOrg: () => void;
  orgs: Organization[];
  orgsError: string | null;
  orgsLoading: boolean;
}

const handleSwitchOrg = (orgId: string) => {
  setOrgId(orgId);
  window.location.reload();
};

const OrgList = ({
  activeOrgId,
  onCreateOrg,
  orgs,
  orgsError,
  orgsLoading,
}: OrgListProps) => (
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
              render: (org) => <span className="font-medium">{org.name}</span>,
            },
            {
              header: "Slug",
              key: "slug",
              render: (org) => (
                <span className="font-mono text-xs text-muted-foreground">{org.slug}</span>
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
                    <Button onClick={() => handleSwitchOrg(org.id)} size="sm" variant="secondary">
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
);

export { OrgList, getRoleBadge };
