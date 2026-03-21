"use client";

import type { Column } from "@raven/ui";
import { ConfirmDialog, DataTable } from "@raven/ui";
import { Trash2, Users } from "lucide-react";
import { useState } from "react";
import type { AdminUser } from "../hooks/use-admin";
import {
  useAdminUsers,
  useDeleteUser,
  useUpdateUserRole
} from "../hooks/use-admin";

const ROLE_OPTIONS = ["admin", "member", "viewer"] as const;


export const UsersTab = () => {
  const { data: users, isPending } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const columns: Column<AdminUser>[] = [
    {
      header: "Name",
      key: "name",
      render: (user) => (
        <span className="font-medium">{user.name || "Unnamed"}</span>
      )
    },
    {
      header: "Email",
      key: "email",
      render: (user) => (
        <span className="text-muted-foreground">{user.email}</span>
      )
    },
    {
      header: "Role",
      key: "role",
      render: (user) => (
        <select
          className="rounded border border-border bg-background px-2 py-1 text-[13px] text-foreground"
          onChange={(e) =>
            updateRole.mutate({ id: user.id, role: e.target.value })
          }
          value={user.role}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )
    },
    {
      header: "Joined",
      key: "createdAt",
      render: (user) => (
        <span className="text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      className: "w-12",
      header: "",
      key: "actions",
      render: (user) => (
        <button
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteTarget(user)}
          title="Delete user"
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      )
    }
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={users ?? []}
        emptyIcon={<Users className="size-5 text-muted-foreground" />}
        emptyTitle="No users found"
        keyExtractor={(user) => user.id}
        loading={isPending}
        loadingMessage="Loading users..."
      />
      <ConfirmDialog
        confirmLabel="Delete"
        description={`This will permanently delete ${deleteTarget?.name || deleteTarget?.email}. This action cannot be undone.`}
        loading={deleteUser.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteUser.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null)
            });
          }
        }}
        open={deleteTarget !== null}
        title="Delete User"
      />
    </>
  );
};
