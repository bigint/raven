"use client";

import { PageHeader } from "@raven/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { UsersTab } from "../admin/components/users-tab";

const UsersPage = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && session?.user?.role !== "admin") {
      router.replace("/overview");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div>
      <PageHeader
        description="Manage users and roles."
        title="Users"
      />
      <UsersTab />
    </div>
  );
};

export default UsersPage;
