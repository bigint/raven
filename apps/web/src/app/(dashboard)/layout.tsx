"use client";

import { Button } from "@raven/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { Shell } from "./components/shell";

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
          <Button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/api/logout";
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/sign-in");
  }

  const user = {
    email: session.user.email,
    name: session.user.name
  };

  return <Shell user={user}>{children}</Shell>;
};

export default DashboardLayout;
