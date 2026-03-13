"use client";

import { motion } from "motion/react";
import { redirect, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { Sidebar } from "./components/sidebar";
import { useOrgs } from "./hooks/use-orgs";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
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
        <motion.div
          animate={{ opacity: 1 }}
          className="px-4 py-4 md:px-8 md:py-6"
          initial={{ opacity: 0 }}
          key={pathname}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLayout;
