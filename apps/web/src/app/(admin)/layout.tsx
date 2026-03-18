"use client";

import { motion } from "motion/react";
import { redirect, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { AdminSidebar } from "./components/admin-sidebar";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { data: session, error, isPending } = useSession();

  if (isPending) {
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

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <AdminSidebar />
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

export default AdminLayout;
