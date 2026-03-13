"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  FileText,
  Key,
  LayoutDashboard,
  Menu,
  Network,
  Receipt,
  Route,
  ScrollText,
  Settings,
  Shield,
  Users,
  Webhook,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Org } from "../hooks/use-orgs";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/providers", icon: Network, label: "Providers" },
  { href: "/keys", icon: Key, label: "Keys" },
  { href: "/prompts", icon: FileText, label: "Prompts" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/routing", icon: Route, label: "Routing" },
  { href: "/requests", icon: ScrollText, label: "Requests" },
  { href: "/budgets", icon: CreditCard, label: "Budgets" },
  { href: "/guardrails", icon: Shield, label: "Guardrails" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/billing", icon: Receipt, label: "Billing" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" }
];

interface SidebarProps {
  activeOrg: Org | null;
  orgs: Org[];
  user: { name?: string | null; email?: string | null };
  onSwitchOrg: (org: Org) => void;
}

export const Sidebar = ({
  activeOrg,
  orgs,
  user,
  onSwitchOrg
}: SidebarProps) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const orgSettingsHref = activeOrg
    ? `/${activeOrg.slug}/settings`
    : "/settings";

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  const navContent = (
    <>
      <OrgSwitcher activeOrg={activeOrg} onSwitch={onSwitchOrg} orgs={orgs} />

      <nav className="flex-1 px-3 py-3 space-y-0.5">
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
            pathname === orgSettingsHref
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          href={orgSettingsHref}
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </nav>

      <UserMenu user={user} />
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium truncate">
          {activeOrg ? activeOrg.name : "Raven"}
        </div>
        <button
          aria-label="Open menu"
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setSidebarOpen(true)}
          type="button"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/50"
            onClick={closeSidebar}
          />
          <aside className="relative z-50 flex h-full w-60 flex-col bg-muted/50 border-r border-border">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                aria-label="Close menu"
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={closeSidebar}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-muted/50 flex-col shrink-0">
        {navContent}
      </aside>
    </>
  );
};
