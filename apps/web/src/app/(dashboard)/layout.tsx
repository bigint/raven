"use client";

import { Button } from "@raven/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { Sidebar } from "./components/sidebar";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { data: session, error, isPending: isSessionPending } = useSession();

  if (isSessionPending) {
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
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar user={session.user} />
      <main
        className="flex-1 overflow-auto overscroll-contain"
        id="main-content"
      >
        <div className="px-4 py-4 md:px-8 md:py-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
