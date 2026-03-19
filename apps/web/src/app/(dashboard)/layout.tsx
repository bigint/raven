"use client";

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { Sidebar } from "./components/sidebar";
import { useOrgs } from "./hooks/use-orgs";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { data: session, error, isPending: isSessionPending } = useSession();
  const { orgs, activeOrg, isPending: isOrgsPending, switchOrg } = useOrgs();

  if (isSessionPending || (session && isOrgsPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Unable to verify your session
          </p>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/sign-in");
  }

  if (!isOrgsPending && orgs.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar
        activeOrg={activeOrg}
        onSwitchOrg={switchOrg}
        orgs={orgs}
        user={session.user}
      />
      <main className="flex-1 overflow-auto overscroll-contain">
        <div className="px-4 py-4 md:px-8 md:py-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
