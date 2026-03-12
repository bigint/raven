"use client";

import { redirect } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Sidebar } from "./components/sidebar";
import { useOrgs } from "./hooks/use-orgs";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending: isSessionPending } = useSession();
  const { orgs, activeOrg, isPending: isOrgsPending, switchOrg } = useOrgs();

  if (isSessionPending || (session && isOrgsPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeOrg={activeOrg}
        orgs={orgs}
        user={session.user}
        onSwitchOrg={switchOrg}
      />
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
