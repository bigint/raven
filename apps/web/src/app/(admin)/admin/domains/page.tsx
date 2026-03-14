"use client";

import type { Column } from "@raven/ui";
import { Badge, DataTable } from "@raven/ui";
import { Globe } from "lucide-react";
import type { AdminDomain } from "../../hooks/use-admin";
import { useAdminDomains } from "../../hooks/use-admin";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "neutral"
> = {
  active: "success",
  failed: "error",
  pending_verification: "warning",
  verified: "neutral"
};

const columns: Column<AdminDomain>[] = [
  {
    header: "Domain",
    key: "domain",
    render: (d) => <span className="font-medium">{d.domain}</span>
  },
  {
    header: "Status",
    key: "status",
    render: (d) => (
      <Badge dot variant={STATUS_VARIANT[d.status] ?? "neutral"}>
        {d.status.replace("_", " ")}
      </Badge>
    )
  },
  {
    header: "Organization",
    key: "orgName",
    render: (d) => <span className="text-muted-foreground">{d.orgName}</span>
  },
  {
    header: "Created",
    key: "createdAt",
    render: (d) => (
      <span className="text-muted-foreground">
        {new Date(d.createdAt).toLocaleDateString()}
      </span>
    )
  },
  {
    header: "Verified",
    key: "verifiedAt",
    render: (d) => (
      <span className="text-muted-foreground">
        {d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString() : "\u2014"}
      </span>
    )
  }
];

const AdminDomainsPage = () => {
  const { data: domains = [], isPending } = useAdminDomains();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Custom Domains</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All custom domains across organizations.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={domains}
        emptyIcon={<Globe className="size-8 text-muted-foreground" />}
        emptyTitle="No custom domains"
        keyExtractor={(d) => d.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminDomainsPage;
