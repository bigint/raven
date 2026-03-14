"use client";

import type { Column } from "@raven/ui";
import { Badge, DataTable } from "@raven/ui";
import { Users } from "lucide-react";
import type { AdminUser } from "../../hooks/use-admin";
import { useAdminUsers } from "../../hooks/use-admin";

const columns: Column<AdminUser>[] = [
  {
    header: "Name",
    key: "name",
    render: (u) => <span className="font-medium">{u.name}</span>
  },
  {
    header: "Email",
    key: "email",
    render: (u) => <span className="text-muted-foreground">{u.email}</span>
  },
  {
    header: "Role",
    key: "role",
    render: (u) => (
      <Badge variant={u.role === "admin" ? "error" : "neutral"}>{u.role}</Badge>
    )
  },
  {
    header: "Orgs",
    key: "orgCount",
    render: (u) => <span className="tabular-nums">{u.orgCount}</span>
  },
  {
    header: "Joined",
    key: "createdAt",
    render: (u) => (
      <span className="text-muted-foreground">
        {new Date(u.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

const AdminUsersPage = () => {
  const { data: users = [], isPending } = useAdminUsers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All registered platform users.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={users}
        emptyIcon={<Users className="size-8 text-muted-foreground" />}
        emptyTitle="No users yet"
        keyExtractor={(u) => u.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminUsersPage;
