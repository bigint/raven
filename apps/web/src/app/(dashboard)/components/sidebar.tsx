"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  Menu,
  Network,
  Plug,
  Route,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  SquareTerminal,
  Webhook,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { UserMenu } from "./user-menu";

const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocked]);
};

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/chat", icon: SquareTerminal, label: "Playground" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/providers", icon: Network, label: "Providers" },
  { href: "/keys", icon: Key, label: "Keys" },
  { href: "/models", icon: Cpu, label: "Models" },
  { href: "/routing", icon: Route, label: "Routing" },
  { href: "/requests", icon: Activity, label: "Requests" },
  { href: "/budgets", icon: CreditCard, label: "Budgets" },
  { href: "/guardrails", icon: Shield, label: "Guardrails" },
  { href: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" },
  { href: "/integrations", icon: Plug, label: "Integrations" }
];

interface SidebarProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
}

export const Sidebar = ({ user }: SidebarProps) => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useLockBodyScroll(drawerOpen);

  const navLinks = (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <Link
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          pathname === "/profile"
            ? "bg-primary text-primary-foreground font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
        href="/profile"
      >
        <Settings className="size-4" />
        Profile
      </Link>
      {isAdmin && (
        <>
          <div className="my-2 border-t border-border" />
          <Link
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            href="/admin"
          >
            <ShieldCheck className="size-4" />
            Admin
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">
              R
            </span>
          </div>
          <span className="text-sm font-semibold truncate">Raven</span>
        </div>
        <button
          aria-label="Open menu"
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setDrawerOpen(true)}
          type="button"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile bottom drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden="true"
              className="fixed inset-0 bg-black/50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeDrawer}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              animate={{ y: 0 }}
              aria-label="Navigation menu"
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-xl"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
              role="dialog"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Drawer handle */}
              <div className="flex justify-center py-2">
                <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">
                      R
                    </span>
                  </div>
                  <span className="font-semibold truncate">Raven</span>
                </div>
                <button
                  aria-label="Close menu"
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={closeDrawer}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
                {navLinks}
              </nav>

              {/* User menu at bottom */}
              <UserMenu user={user} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-muted/50 flex-col shrink-0 h-screen sticky top-0">
        <div className="shrink-0 flex items-center gap-2 px-4 py-4 border-b border-border">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">R</span>
          </div>
          <span className="font-semibold">Raven</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navLinks}
        </nav>
        <div className="shrink-0">
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  );
};
