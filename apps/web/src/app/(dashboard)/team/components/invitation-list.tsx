"use client";

import { Mail, Trash2 } from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "@raven/ui";

import type { Invitation } from "../hooks/use-team-data";

const ROLE_BADGE_VARIANT: Record<string, "primary" | "neutral"> = {
  admin: "primary",
  member: "neutral",
  owner: "primary",
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "success" | "neutral"> = {
  accepted: "success",
  pending: "warning",
};

interface InvitationListProps {
  invitations: Invitation[];
  onDelete: (id: string) => void;
  onInvite: () => void;
}

const InvitationList = ({
  invitations,
  onDelete,
  onInvite,
}: InvitationListProps) => {
  if (invitations.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onInvite}>
            <Mail className="size-4" />
            Invite a member
          </Button>
        }
        icon={<Mail className="size-8" />}
        message="No pending invitations."
      />
    );
  }

  return (
    <DataTable
      columns={[
        {
          header: "Email",
          key: "email",
          render: (inv) => (
            <span className="font-medium">{inv.email}</span>
          ),
        },
        {
          header: "Role",
          key: "role",
          render: (inv) => (
            <Badge variant={ROLE_BADGE_VARIANT[inv.role] ?? "neutral"}>
              {inv.role}
            </Badge>
          ),
        },
        {
          header: "Status",
          key: "status",
          render: (inv) => (
            <Badge
              variant={STATUS_BADGE_VARIANT[inv.status] ?? "neutral"}
            >
              {inv.status}
            </Badge>
          ),
        },
        {
          header: "Expires",
          key: "expires",
          render: (inv) => (
            <span className="text-sm text-muted-foreground">
              {new Date(inv.expiresAt).toLocaleDateString()}
            </span>
          ),
        },
        {
          align: "right",
          header: "Actions",
          key: "actions",
          render: (inv) => (
            <div className="flex items-center justify-end gap-1">
              <button
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(inv.id)}
                title="Revoke invitation"
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ),
        },
      ]}
      data={invitations}
      rowKey={(inv) => inv.id}
    />
  );
};

export { InvitationList };
