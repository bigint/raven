"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  Key,
  LayoutDashboard,
  Network,
  Receipt,
  Route,
  ScrollText,
  Settings,
  Shield,
  Users,
  Webhook
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
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
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
  const orgSettingsHref = activeOrg
    ? `/${activeOrg.slug}/settings`
    : "/settings";

  return (
    <aside className="w-60 border-r border-border bg-muted/50 flex flex-col shrink-0">
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
    </aside>
  );
};
