"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, ConfirmDialog, DataTable, Tooltip } from "@raven/ui";
import { Mail, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Invitation } from "../hooks/use-admin";
import { useAdminInvitations, useRevokeInvitation } from "../hooks/use-admin";

export const InvitationsTab = () => {
  const { data: invitations, isPending } = useAdminInvitations();
  const revokeInvitation = useRevokeInvitation();
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  const columns: Column<Invitation>[] = [
    {
      header: "Email",
      key: "email",
      render: (invitation) => (
        <span className="font-medium">{invitation.email}</span>
      )
    },
    {
      header: "Role",
      key: "role",
      render: (invitation) => (
        <Badge variant="neutral">
          {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
        </Badge>
      )
    },
    {
      header: "Expires",
      key: "expiresAt",
      render: (invitation) => {
        const expired = new Date(invitation.expiresAt) < new Date();
        return (
          <span
            className={expired ? "text-destructive" : "text-muted-foreground"}
          >
            {expired
              ? "Expired"
              : new Date(invitation.expiresAt).toLocaleDateString()}
          </span>
        );
      }
    },
    {
      header: "Sent",
      key: "createdAt",
      render: (invitation) => (
        <span className="text-muted-foreground">
          {new Date(invitation.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      className: "w-12",
      header: "",
      key: "actions",
      render: (invitation) => (
        <Tooltip content="Revoke invitation">
          <Button
            className="p-1.5 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setRevokeTarget(invitation)}
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </Tooltip>
      )
    }
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={invitations ?? []}
        emptyIcon={<Mail className="size-5 text-muted-foreground" />}
        emptyTitle="No pending invitations"
        keyExtractor={(invitation) => invitation.id}
        loading={isPending}
        loadingMessage="Loading invitations..."
      />
      <ConfirmDialog
        confirmLabel="Revoke"
        description={`This will revoke the invitation for ${revokeTarget?.email}. They will no longer be able to use the invite link.`}
        loading={revokeInvitation.isPending}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) {
            revokeInvitation.mutate(revokeTarget.id, {
              onSuccess: () => setRevokeTarget(null)
            });
          }
        }}
        open={revokeTarget !== null}
        title="Revoke Invitation"
      />
    </>
  );
};
