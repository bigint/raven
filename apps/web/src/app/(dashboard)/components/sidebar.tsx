"use client";

import { NavGroup, type NavItem, RavenLogo, UsageMeter } from "@raven/ui";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronsUpDown,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  Menu,
  Network,
  Route,
  ScrollText,
  Search,
  Settings,
  Shield,
  SquareTerminal,
  Users,
  Webhook,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { UserMenu } from "./user-menu";

const OVERVIEW_ITEMS: readonly NavItem[] = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" }
];

const BUILD_ITEMS: readonly NavItem[] = [
  { href: "/chat", icon: SquareTerminal, label: "Playground" },
  { href: "/knowledge", icon: BookOpen, label: "Knowledge" },
  { href: "/models", icon: Cpu, label: "Models" },
  { href: "/routing", icon: Route, label: "Routing" },
  { href: "/guardrails", icon: Shield, label: "Guardrails" }
];

const MONITOR_ITEMS: readonly NavItem[] = [
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/requests", icon: Activity, label: "Requests" },
  { href: "/audit-logs", icon: ScrollText, label: "Audit Logs" }
];

const CONFIGURE_ITEMS: readonly NavItem[] = [
  { href: "/providers", icon: Network, label: "Providers" },
  { href: "/keys", icon: Key, label: "API Keys" },
  { href: "/budgets", icon: CreditCard, label: "Budgets" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" }
];

const ADMIN_ITEMS: readonly NavItem[] = [
  { href: "/users", icon: Users, label: "Users" },
  { href: "/settings", icon: Settings, label: "Instance Settings" }
];

const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocked]);
};

interface SidebarProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
  readonly onOpenPalette: () => void;
}

const NavSections = ({
  pathname,
  isAdmin,
  collapsed
}: {
  pathname: string;
  isAdmin: boolean;
  collapsed?: boolean;
}) => (
  <>
    <NavGroup
      collapsed={collapsed}
      items={OVERVIEW_ITEMS}
      pathname={pathname}
    />
    <NavGroup
      collapsed={collapsed}
      items={BUILD_ITEMS}
      label="Build"
      pathname={pathname}
    />
    <NavGroup
      collapsed={collapsed}
      items={MONITOR_ITEMS}
      label="Monitor"
      pathname={pathname}
    />
    <NavGroup
      collapsed={collapsed}
      items={CONFIGURE_ITEMS}
      label="Configure"
      pathname={pathname}
    />
    {isAdmin && (
      <NavGroup
        collapsed={collapsed}
        items={ADMIN_ITEMS}
        label="Admin"
        pathname={pathname}
      />
    )}
  </>
);

export const Sidebar = ({ user, onOpenPalette }: SidebarProps) => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useLockBodyScroll(drawerOpen);

  return (
    <>
      <div className="flex md:hidden items-center justify-between border-b border-border bg-muted px-3.5 h-11">
        <div className="flex items-center gap-2">
          <RavenLogo className="size-5 text-foreground" />
          <span className="text-sm font-semibold">Raven</span>
        </div>
        <button
          aria-label="Open menu"
          className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setDrawerOpen(true)}
          type="button"
        >
          <Menu className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden="true"
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeDrawer}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              animate={{ y: 0 }}
              aria-label="Navigation"
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-xl border-t border-border bg-muted shadow-lg"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
              role="dialog"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center py-2">
                <div className="h-1 w-8 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-3.5 pb-2">
                <div className="flex items-center gap-2">
                  <RavenLogo className="size-5 text-foreground" />
                  <span className="font-semibold">Raven</span>
                </div>
                <button
                  aria-label="Close menu"
                  className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={closeDrawer}
                  type="button"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-1.5 pb-3">
                <NavSections isAdmin={!!isAdmin} pathname={pathname} />
              </nav>
              <UserMenu user={user} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex w-60 border-r border-border bg-muted flex-col shrink-0 h-screen sticky top-0">
        <button
          className="flex items-center gap-2 px-3 h-12 border-b border-border hover:bg-accent/60 transition-colors"
          type="button"
        >
          <RavenLogo className="size-5 text-foreground shrink-0" />
          <span className="flex-1 text-left text-sm font-semibold text-foreground">
            Raven
          </span>
          <ChevronsUpDown
            className="size-3.5 text-muted-foreground"
            strokeWidth={1.5}
          />
        </button>

        <div className="px-2.5 pt-2.5 pb-1">
          <button
            className="w-full flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-background text-muted-foreground text-sm hover:border-input transition-colors"
            onClick={onOpenPalette}
            type="button"
          >
            <Search className="size-3.5" strokeWidth={1.5} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm border border-border bg-muted font-mono text-[10px] font-medium text-muted-foreground leading-none">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
          <NavSections isAdmin={!!isAdmin} pathname={pathname} />
        </nav>

        {/* TODO: wire real usage data in a follow-up; placeholder values for now */}
        <div className="shrink-0 border-t border-border p-2.5 space-y-2.5">
          <UsageMeter
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
            }
            label="Usage"
            resetsAt="Apr 30"
            total={1000000}
            used={640000}
          />
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  );
};
