"use client";

import type { Column } from "@raven/ui";
import { Button, ConfirmDialog, DataTable, Select } from "@raven/ui";
import { Trash2, Users } from "lucide-react";
import { useState } from "react";
import type { AdminUser } from "../hooks/use-admin";
import {
  useAdminUsers,
  useDeleteUser,
  useUpdateUserRole
} from "../hooks/use-admin";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

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
        <Select
          className="w-32"
          onChange={(value) =>
            updateRole.mutate({ id: user.id, role: value })
          }
          options={ROLE_OPTIONS}
          value={user.role}
        />
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
        <Button
          className="p-1.5 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteTarget(user)}
          title="Delete user"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
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
