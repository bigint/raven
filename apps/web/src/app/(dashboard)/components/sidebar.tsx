"use client";

import type { Plan } from "@raven/types";
import { PLAN_FEATURES } from "@raven/types";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  ClipboardCheck,
  Cpu,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  FlaskConical,
  Key,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Network,
  Plug,
  Puzzle,
  Radio,
  Receipt,
  Route,
  ScrollText,
  Settings,
  Shield,
  ShieldBan,
  ShieldCheck,
  SquareTerminal,
  TrendingUp,
  Users,
  Webhook,
  Wrench,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Org } from "../hooks/use-orgs";
import { OrgSwitcher } from "./org-switcher";
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
  href: string;
  label: string;
  icon: LucideIcon;
  gate?: (plan: Plan) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/chat", icon: SquareTerminal, label: "Playground" },
  { href: "/conversations", icon: MessageCircle, label: "Conversations" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/evaluations", icon: ClipboardCheck, label: "Evaluations" },
  { href: "/providers", icon: Network, label: "Providers" },
  { href: "/keys", icon: Key, label: "Keys" },
  { href: "/prompts", icon: FileText, label: "Prompts" },
  { href: "/logs", icon: ScrollText, label: "Logs" },
  { href: "/events", icon: Radio, label: "Events" },
  { href: "/tools", icon: Wrench, label: "Tool Use" },
  { href: "/adoption", icon: TrendingUp, label: "Adoption" },
  { href: "/models", icon: Cpu, label: "Models" },
  { href: "/routing", icon: Route, label: "Routing" },
  { href: "/experiments", icon: FlaskConical, label: "Experiments" },
  { href: "/requests", icon: Activity, label: "Requests" },
  { href: "/budgets", icon: CreditCard, label: "Budgets" },
  { href: "/finops", icon: DollarSign, label: "FinOps" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/mcp", icon: Plug, label: "MCP Servers" },
  { href: "/catalog", icon: BookOpen, label: "Catalog" },
  {
    gate: (plan) => PLAN_FEATURES[plan].hasGuardrails,
    href: "/guardrails",
    icon: Shield,
    label: "Guardrails"
  },
  { href: "/ip-allowlists", icon: ShieldBan, label: "IP Allowlists" },
  {
    gate: (plan) => PLAN_FEATURES[plan].hasGuardrails,
    href: "/policies",
    icon: ShieldCheck,
    label: "Policies"
  },
  {
    gate: (plan) => PLAN_FEATURES[plan].hasGuardrails,
    href: "/compliance",
    icon: FileCheck,
    label: "Compliance"
  },
  {
    gate: (plan) => PLAN_FEATURES[plan].hasTeams,
    href: "/team",
    icon: Users,
    label: "Team"
  },
  { href: "/billing", icon: Receipt, label: "Billing" },
  { href: "/exports", icon: Download, label: "Exports" },
  {
    gate: (plan) => PLAN_FEATURES[plan].hasWebhooks,
    href: "/webhooks",
    icon: Webhook,
    label: "Webhooks"
  },
  { href: "/plugins", icon: Puzzle, label: "Plugins" }
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const orgSettingsHref = activeOrg
    ? `/${activeOrg.slug}/settings`
    : "/settings";
  const plan = (activeOrg?.plan ?? "free") as Plan;

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.gate || item.gate(plan)),
    [plan]
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useLockBodyScroll(drawerOpen);

  const navLinks = (
    <>
      {visibleItems.map((item) => {
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
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">
              {activeOrg?.name?.charAt(0)?.toUpperCase() ?? "R"}
            </span>
          </div>
          <span className="text-sm font-semibold truncate">
            {activeOrg?.name ?? "Raven"}
          </span>
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
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-xl"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
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
                      {activeOrg?.name?.charAt(0)?.toUpperCase() ?? "R"}
                    </span>
                  </div>
                  <span className="font-semibold truncate">
                    {activeOrg?.name ?? "Raven"}
                  </span>
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
        <div className="shrink-0">
          <OrgSwitcher
            activeOrg={activeOrg}
            onSwitch={onSwitchOrg}
            orgs={orgs}
          />
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
