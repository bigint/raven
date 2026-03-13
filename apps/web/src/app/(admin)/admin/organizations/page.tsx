"use client";

import { Badge, DataTable } from "@raven/ui";
import type { Column } from "@raven/ui";
import { Building2 } from "lucide-react";
import type { AdminOrg } from "../../hooks/use-admin";
import { useAdminOrgs } from "../../hooks/use-admin";

const PLAN_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "neutral" | "primary"
> = {
  enterprise: "error",
  free: "neutral",
  pro: "primary",
  team: "success"
};

const columns: Column<AdminOrg>[] = [
  {
    header: "Name",
    key: "name",
    render: (o) => <span className="font-medium">{o.name}</span>
  },
  {
    header: "Slug",
    key: "slug",
    render: (o) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
        {o.slug}
      </code>
    )
  },
  {
    header: "Plan",
    key: "plan",
    render: (o) => {
      const plan = o.plan ?? "free";
      return (
        <Badge variant={PLAN_VARIANT[plan] ?? "neutral"}>{plan}</Badge>
      );
    }
  },
  {
    header: "Members",
    key: "memberCount",
    render: (o) => <span className="tabular-nums">{o.memberCount}</span>
  },
  {
    header: "Created",
    key: "createdAt",
    render: (o) => (
      <span className="text-muted-foreground">
        {new Date(o.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

const AdminOrganizationsPage = () => {
  const { data: orgs = [], isPending } = useAdminOrgs();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Organizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All organizations on the platform.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={orgs}
        emptyIcon={<Building2 className="size-8 text-muted-foreground" />}
        emptyTitle="No organizations yet"
        keyExtractor={(o) => o.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminOrganizationsPage;
